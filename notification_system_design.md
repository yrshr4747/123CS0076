# Notification System Design

## Stage 1 - REST API Design

The system is a campus notification platform that sends students updates about placements, events and results. 

### Entities

**Notification** - has an id, type (Placement/Event/Result), message, timestamp, and read status

**Student** - id, name, email, department

### Endpoints

- `GET /api/notifications` - get all notifications, supports query params like `type`, `limit`, `page`
- `GET /api/notifications/:id` - get a single notification
- `POST /api/notifications` - create new notification (admin side)
- `PATCH /api/notifications/:id/read` - mark one as read
- `PATCH /api/notifications/mark-all-read` - mark all as read
- `DELETE /api/notifications/:id` - delete a notification
- `GET /api/notifications/unread-count` - get how many unread

Example response for GET /api/notifications:
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "a4aad02e-...",
        "type": "Placement",
        "title": "Google Hiring Drive",
        "message": "Google is conducting on-campus interviews on Dec 15",
        "isRead": false,
        "createdAt": "2026-04-22T17:51:30Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalCount": 98,
      "limit": 20
    }
  }
}
```

### Real-time updates

Using WebSocket (Socket.IO) because:
- Polling wastes bandwidth with constant requests even when nothing new
- SSE is one directional only
- WebSocket gives full duplex connection, low overhead, instant push

The flow is: client connects → server authenticates → client joins room by studentId → server pushes `new_notification` event when something is created

---

## Stage 2 - Database Design

### Why PostgreSQL

- Notifications have a fixed schema so relational makes sense
- Need ACID guarantees (if notification is marked read it should stay read even if server crashes)
- Native ENUM type maps directly to notification_type
- Composite indexes on (studentID, isRead, createdAt) will be important for performance

### Schema

```sql
CREATE TYPE notification_type AS ENUM ('Event', 'Result', 'Placement');

CREATE TABLE students (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    email       VARCHAR(255) UNIQUE NOT NULL,
    department  VARCHAR(100),
    created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE notifications (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id        INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    notification_type notification_type NOT NULL,
    title             VARCHAR(500) NOT NULL,
    message           TEXT NOT NULL,
    is_read           BOOLEAN DEFAULT FALSE,
    created_at        TIMESTAMP DEFAULT NOW(),
    updated_at        TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_student_unread
    ON notifications (student_id, is_read, created_at DESC);

CREATE INDEX idx_notifications_type
    ON notifications (notification_type);
```

### Scaling

- Table partitioning by created_at (monthly) when data gets too big
- Batch mark-all-read into single UPDATE instead of N updates
- Archive notifications older than 6 months

---

## Stage 3 - Query Optimization

### The slow query

```sql
SELECT * FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt ASC;
```

Problems with this:
- `SELECT *` pulls all columns including large text in message field - unnecessary
- No composite index means full table scan on 5M rows
- No pagination, returns everything at once
- ASC order shows oldest first which doesnt make sense UX wise

Fixed version:
```sql
SELECT id, notification_type, title, message, is_read, created_at
FROM notifications
WHERE student_id = 1042 AND is_read = FALSE
ORDER BY created_at DESC
LIMIT 20 OFFSET 0;
```

Without index: O(n) scan of all 5M rows + sorting
With composite index: O(log n + k) where k = matching rows

### Should you index every column?

No thats a bad idea because:
- Every INSERT/UPDATE/DELETE has to update all indexes too, slowing down writes
- Each index takes up disk space (B-tree structure), indexing everything on 5M rows could double storage
- Query optimizer usually only uses one index per table scan anyway
- More indexes = longer VACUUM operations

Just index whats actually in WHERE/ORDER BY clauses of frequent queries. For us thats `(student_id, is_read, created_at DESC)` and `(notification_type)`. Two indexes cover everything.

### Placement notifications last 7 days

```sql
SELECT id, notification_type, title, message, is_read, created_at
FROM notifications
WHERE notification_type = 'Placement'
  AND created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

---

## Stage 4 - Performance Improvement

### Problem
50,000 students all fetching notifications on page load = DB gets hammered

### Strategy 1: Redis Caching
Cache each students notifications in Redis with key `notifications:{studentId}`. Check Redis first, if miss then query DB and cache it. Set TTL of 5 min. Invalidate when new notification arrives.

Pros: ~1ms reads vs ~50ms from DB, way fewer DB queries
Cons: extra infra, cache invalidation complexity, memory cost for 50K students

### Strategy 2: Cursor-based Pagination
Instead of fetching all notifications, fetch first 20 and use cursor for next page. Client loads more on scroll.

Pros: less data per request, consistent performance
Cons: cant jump to arbitrary page, cursor can become invalid

### Strategy 3: Read Replicas
Route SELECT queries to read replicas, writes to primary.

Pros: distributes load, no app code changes needed
Cons: replication lag, higher infra cost

### What I'd do
Combine Redis caching + cursor pagination + connection pooling. Cache handles 95%+ reads, pagination keeps requests small, pooling prevents connection exhaustion.

---

## Stage 5 - Bulk Notification

### Current implementation problems

```
function notify_all(student_ids, message):
    for student_id in student_ids:
        send_email(student_id, message)
        save_to_db(student_id, message)
        push_to_app(student_id, message)
```

Whats wrong:
- Sequential loop. 50K iterations at 100ms each = ~83 min. Thats terrible.
- No error handling. If email fails for student #200, either crashes or silently skips.
- Everything coupled together. If email service is slow it blocks DB write and push too.
- No record of progress. If server crashes at #25000, no idea who already got notified.

### The 200 failed emails
With current implementation those 200 students just never got their email. No retry, no tracking of which ones failed. The DB writes and push for those might or might not have worked depending on error handling.

### Should DB save and email happen together?
No. DB save is fast (1-5ms, local). Email is slow (100-500ms, external API, can fail). Save to DB first as source of truth, then queue email separately so it can retry independently.

### Better approach

```
function notify_all(student_ids, message):
    notification_ids = batch_insert_to_db(student_ids, message)
    
    for each (student_id, notification_id):
        email_queue.enqueue({ student_id, notification_id, message })
        push_queue.enqueue({ student_id, notification_id, message })
    
    return { status: "queued", total: len(student_ids) }

function email_worker(job):
    try:
        send_email(job.student_id, job.message)
    catch:
        if job.attempts < 3:
            retry with exponential backoff
        else:
            send to dead letter queue, alert ops
```

Key improvements: HR gets response in ~2 sec instead of 83 min, failed emails get retried 3x, each operation is independent, queue persists so server crash doesnt lose progress.

---

## Stage 6 - Priority Inbox Algorithm

Priority is calculated using type weight + recency.

Type weights:
- Placement = 3 (most important, career impact)
- Result = 2 (academic standing)
- Event = 1 (informational)

Recency: `recencyScore = 1 / (1 + hoursAgo * 0.1)`

Final score: `priority = typeWeight * recencyScore`

So a Placement notification from 1 hour ago scores 3 * 0.909 = 2.73, while an Event from 10 hours ago scores 1 * 0.5 = 0.5.

For maintaining top 10 efficiently: could use a min-heap of size 10 (O(log N) insertion), but for our dataset sizes just scoring everything and sorting works fine.

This is implemented in `notification_app_be/src/services/priorityService.ts`

---

## Stage 7 - Frontend

React app (Vite) with two views:

1. **All Notifications** - every notification from the API with type filters (All/Placement/Result/Event)
2. **Priority Inbox** - top N notifications ranked by the priority algorithm, configurable N, shows priority scores

Since theres no persistent user auth, we track "new vs viewed" notifications using localStorage. When a notification loads, its ID gets stored after 3 seconds. Notifications not in localStorage show a "NEW" badge.

Responsive design with breakpoint at 768px. Vanilla CSS with custom properties for theming.
