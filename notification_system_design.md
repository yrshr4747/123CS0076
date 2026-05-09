# Notification System Design

## Stage 1 — REST API Design

### Overview

This document outlines the REST API contract for a campus notification platform that delivers real-time updates to students regarding **Placements**, **Events**, and **Results**.

### Core Entities

**Notification**
```json
{
  "id": "uuid",
  "type": "Placement | Event | Result",
  "title": "string",
  "message": "string",
  "isRead": "boolean",
  "createdAt": "ISO 8601 timestamp",
  "updatedAt": "ISO 8601 timestamp"
}
```

**Student** (simplified — auth is pre-handled)
```json
{
  "id": "integer",
  "name": "string",
  "email": "string",
  "department": "string"
}
```

### API Endpoints

#### 1. Get All Notifications

```
GET /api/notifications
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | integer | No | Page number (default: 1) |
| `limit` | integer | No | Results per page (default: 20) |
| `type` | string | No | Filter by notification type: `Placement`, `Event`, `Result` |
| `is_read` | boolean | No | Filter by read status |
| `sort_by` | string | No | Sort field (default: `createdAt`) |
| `order` | string | No | `asc` or `desc` (default: `desc`) |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "a4aad02e-19d0-4153-86d9-58bf55d7c402",
        "type": "Placement",
        "title": "Google Hiring Drive",
        "message": "Google is conducting on-campus interviews on Dec 15",
        "isRead": false,
        "createdAt": "2026-04-22T17:51:30Z",
        "updatedAt": "2026-04-22T17:51:30Z"
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

#### 2. Get Single Notification

```
GET /api/notifications/:id
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "a4aad02e-19d0-4153-86d9-58bf55d7c402",
    "type": "Placement",
    "title": "Google Hiring Drive",
    "message": "Google is conducting on-campus interviews on Dec 15",
    "isRead": true,
    "createdAt": "2026-04-22T17:51:30Z",
    "updatedAt": "2026-04-22T17:52:00Z"
  }
}
```

**Error (404):**
```json
{
  "success": false,
  "error": "notification not found"
}
```

#### 3. Create Notification (Admin/HR)

```
POST /api/notifications
```

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "type": "Placement",
  "title": "Microsoft Hiring",
  "message": "Microsoft campus drive scheduled for Jan 10. Eligible branches: CSE, IT, ECE.",
  "targetStudentIds": [1042, 1043, 1044]
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "b283218f-ea5a-4b7c-93a9-1f2f240d64b0",
    "type": "Placement",
    "title": "Microsoft Hiring",
    "message": "Microsoft campus drive scheduled for Jan 10. Eligible branches: CSE, IT, ECE.",
    "isRead": false,
    "createdAt": "2026-04-22T18:00:00Z"
  }
}
```

#### 4. Mark Notification as Read

```
PATCH /api/notifications/:id/read
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "a4aad02e-19d0-4153-86d9-58bf55d7c402",
    "isRead": true,
    "updatedAt": "2026-04-22T18:05:00Z"
  }
}
```

#### 5. Mark All Notifications as Read

```
PATCH /api/notifications/mark-all-read
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "updatedCount": 15
  }
}
```

#### 6. Delete Notification

```
DELETE /api/notifications/:id
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "notification deleted"
}
```

#### 7. Get Unread Count

```
GET /api/notifications/unread-count
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "unreadCount": 12
  }
}
```

### Real-Time Notification Mechanism

**Technology:** WebSocket via Socket.IO

**Why WebSocket over alternatives:**
- **Polling** introduces unnecessary latency and wastes bandwidth with constant requests even when there's nothing new.
- **SSE (Server-Sent Events)** is unidirectional — fine for receiving but no way for the client to acknowledge receipt or send read confirmations through the same channel.
- **WebSocket** provides a full-duplex, persistent connection that's ideal for real-time push with minimal overhead.

**Connection Flow:**
```
1. Client connects:  ws://server/notifications
2. Server authenticates the socket connection
3. Client joins a room identified by their studentId
4. When a new notification is created:
   a. Server saves to DB
   b. Server emits 'new_notification' to the student's room
5. Client receives the event and updates the UI instantly
```

**Socket Events:**

| Event | Direction | Payload |
|-------|-----------|---------|
| `new_notification` | Server → Client | Full notification object |
| `notification_read` | Client → Server | `{ notificationId: "uuid" }` |
| `unread_count_update` | Server → Client | `{ count: number }` |

---

## Stage 2 — Database Design

### Database Choice: PostgreSQL

**Why PostgreSQL over other options:**

| Factor | PostgreSQL | MongoDB | MySQL |
|--------|-----------|---------|-------|
| ACID compliance | Full | Limited (per-document) | Full |
| Enum support | Native ENUM type | No native enums | Native ENUM type |
| JSON support | JSONB with indexing | Native | JSON type (no indexing) |
| Full-text search | Built-in `tsvector` | Built-in | Plugin-based |
| Scaling | Partitioning, read replicas | Horizontal sharding | Replication |

PostgreSQL is the right fit here because:
- Notifications have a **fixed, predictable schema** — relational modeling is natural.
- We need **ACID guarantees** — a notification marked as read should stay read even if the server crashes mid-request.
- **Enum types** map directly to our `notification_type` field.
- **Composite indexes** on `(studentID, isRead, createdAt)` will be critical for performance as data grows.

### Schema

```sql
-- enum for notification types
CREATE TYPE notification_type AS ENUM ('Event', 'Result', 'Placement');

-- students table
CREATE TABLE students (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    email       VARCHAR(255) UNIQUE NOT NULL,
    department  VARCHAR(100),
    created_at  TIMESTAMP DEFAULT NOW()
);

-- notifications table
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

-- indexes for common query patterns
CREATE INDEX idx_notifications_student_unread
    ON notifications (student_id, is_read, created_at DESC);

CREATE INDEX idx_notifications_type
    ON notifications (notification_type);

CREATE INDEX idx_notifications_created_at
    ON notifications (created_at DESC);
```

### Scaling Considerations

As data volume increases, these problems emerge:

1. **Large table scans** — With millions of rows, even indexed queries slow down because the index itself becomes large.
   - **Solution:** Table partitioning by `created_at` (monthly partitions). Old partitions can be archived or moved to cold storage.

2. **Write contention** — High volume of mark-as-read updates compete with inserts.
   - **Solution:** Batch `mark-all-read` into a single UPDATE rather than N individual updates.

3. **Storage growth** — Old notifications accumulate indefinitely.
   - **Solution:** Implement a retention policy — archive notifications older than 6 months to a separate `notifications_archive` table.

### Queries Based on REST APIs

**Get all notifications for a student (paginated):**
```sql
SELECT id, notification_type, title, message, is_read, created_at
FROM notifications
WHERE student_id = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;
```

**Get unread count:**
```sql
SELECT COUNT(*) AS unread_count
FROM notifications
WHERE student_id = $1 AND is_read = FALSE;
```

**Mark single notification as read:**
```sql
UPDATE notifications
SET is_read = TRUE, updated_at = NOW()
WHERE id = $1 AND student_id = $2;
```

**Mark all as read:**
```sql
UPDATE notifications
SET is_read = TRUE, updated_at = NOW()
WHERE student_id = $1 AND is_read = FALSE;
```

**Filter by type:**
```sql
SELECT id, notification_type, title, message, is_read, created_at
FROM notifications
WHERE student_id = $1
  AND notification_type = $2
ORDER BY created_at DESC
LIMIT $3 OFFSET $4;
```

---

## Stage 3 — Query Optimization

### Analyzing the Slow Query

```sql
SELECT * FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt ASC;
```

**Is this query accurate?**

Yes, it correctly fetches unread notifications for student 1042 ordered by creation time. However, it has several performance issues.

**Why is it slow?**

With 50,000 students and 5,000,000 notifications, this query suffers from:

1. **`SELECT *` fetches all columns** — If the `message` column contains large text blobs, each row pulled from disk is unnecessarily heavy. The client probably doesn't need every field in the listing view.

2. **No composite index** — Without an index on `(studentID, isRead, createdAt)`, PostgreSQL has to do a sequential scan of the entire 5M-row table, check each row against the WHERE conditions, and then sort the matching rows. That's O(n) where n = 5 million.

3. **No pagination** — The query returns ALL unread notifications at once. A student could have thousands of unread notifications, consuming unnecessary memory and network bandwidth.

4. **ASC ordering on createdAt** — Users typically want the newest notifications first. ASC shows oldest first, which is questionable from a UX standpoint and also prevents the DB from using an index that's sorted DESC.

**What would you change?**

```sql
SELECT id, notification_type, title, message, is_read, created_at
FROM notifications
WHERE student_id = 1042 AND is_read = FALSE
ORDER BY created_at DESC
LIMIT 20 OFFSET 0;
```

Changes:
- Select only needed columns instead of `*`
- `DESC` order so newest notifications appear first
- `LIMIT` + `OFFSET` for pagination
- Relies on the composite index `(student_id, is_read, created_at DESC)`

**Likely computation cost of the original query:**
- Without index: **O(n)** full table scan — ~5,000,000 row comparisons + sorting all matches.
- With proper composite index: **O(log n + k)** where k is the number of matching rows. The index seek is logarithmic, then it walks the leaf nodes.

### Should You Add Indexes on Every Column?

**No. This is bad advice.** Here's why:

1. **Write performance degrades** — Every INSERT, UPDATE, or DELETE must also update every index. With 6+ indexes on a table receiving frequent writes (new notifications, mark-as-read updates), write latency increases significantly.

2. **Storage overhead** — Each index is a separate B-tree data structure stored on disk. Indexing every column on a 5M row table could easily double the storage requirement.

3. **Diminishing returns** — The query optimizer can only use one index per table scan (in most cases). Having indexes on columns that are rarely queried (`updated_at`, `message`) wastes resources.

4. **Index maintenance** — More indexes mean longer VACUUM operations and more complex query planning.

**The right approach:** Index only the columns that appear in WHERE clauses, JOIN conditions, and ORDER BY clauses of frequently executed queries. In our case:
- `(student_id, is_read, created_at DESC)` — covers the primary query pattern
- `(notification_type)` — covers filtering by type
- That's it. Two indexes handle all our query patterns efficiently.

### Placement Notifications in the Last 7 Days

```sql
SELECT id, notification_type, title, message, is_read, created_at
FROM notifications
WHERE notification_type = 'Placement'
  AND created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

This query benefits from the `idx_notifications_type` index for the type filter and `idx_notifications_created_at` for the date range.

---

## Stage 4 — Performance Improvement Strategies

### Problem

Notifications are fetched on every page load for every student. With 50,000 students, the DB is overwhelmed — too many concurrent reads hammering the same table.

### Strategy 1: Redis Caching Layer

**How it works:**
- Cache each student's recent notifications in Redis with key pattern `notifications:{studentId}`
- On page load, check Redis first. If hit → return cached data. If miss → query DB, cache the result.
- Invalidate/update cache when new notifications arrive or when mark-as-read happens.
- Set TTL of 5 minutes so stale data auto-expires.

**Tradeoffs:**
| Pro | Con |
|-----|-----|
| Dramatic read latency reduction (~1ms vs ~50ms) | Additional infrastructure (Redis server) |
| DB gets far fewer queries | Cache invalidation is hard — stale reads possible |
| Scales horizontally (Redis Cluster) | Memory cost — 50K students × cached data |

### Strategy 2: Cursor-Based Pagination

**How it works:**
- Instead of fetching all notifications, fetch only the first page (20 items).
- Use a cursor (last seen `created_at` + `id`) for subsequent pages.
- The client loads more only when the user scrolls down.

**Tradeoffs:**
| Pro | Con |
|-----|-----|
| Reduces data transfer per request | Slightly more complex API contract |
| Consistent performance regardless of total count | Can't jump to arbitrary page numbers |
| Works well with real-time updates | Cursor can become invalid if data changes |

### Strategy 3: Read Replicas

**How it works:**
- Set up one or more PostgreSQL read replicas.
- Route all SELECT queries to replicas, all writes to the primary.
- Use connection pooling (PgBouncer) to manage connections efficiently.

**Tradeoffs:**
| Pro | Con |
|-----|-----|
| Distributes read load across multiple servers | Replication lag — reads might be slightly stale |
| No application code changes needed (just routing) | Higher infrastructure cost |
| Can add more replicas as load grows | Write performance is unchanged |

### Strategy 4: Connection Pooling

**How it works:**
- Use PgBouncer or built-in pool to limit concurrent DB connections.
- Reuse connections instead of opening/closing per request.
- Set pool size based on available DB resources.

**Tradeoffs:**
| Pro | Con |
|-----|-----|
| Prevents connection exhaustion | Doesn't reduce query load — just manages it better |
| Minimal setup effort | Pool size tuning requires monitoring |
| Works with any other strategy | |

### Recommended Approach

Combine **Redis caching** + **cursor-based pagination** + **connection pooling**. This gives you:
- Cache handles the read storm (95%+ cache hit rate for active students)
- Pagination ensures each request is lightweight
- Connection pooling prevents the remaining DB queries from overwhelming connections

Read replicas become worthwhile only when you outgrow a single cache + DB setup.

---

## Stage 5 — Bulk Notification Architecture

### Analyzing the Existing Implementation

```
function notify_all(student_ids: array, message: string):
    for student_id in student_ids:
        send_email(student_id, message)    # calls Email API
        save_to_db(student_id, message)    # DB insert
        push_to_app(student_id, message)   # real-time push
```

### Shortcomings

1. **Sequential processing** — 50,000 iterations in a single loop. If each iteration takes 100ms (email API call), the total time is ~83 minutes. HR is staring at a loading spinner.

2. **No error handling** — If `send_email` fails for student #200, what happens? The loop either crashes (remaining 49,800 students get nothing) or silently continues (no way to retry the failed ones).

3. **Tight coupling** — DB write, email, and push notification are bundled together. If the email service is slow or down, it blocks the DB write and the push notification too.

4. **No backpressure** — Flooding the email service with 50,000 requests simultaneously (or sequentially) can trigger rate limits, timeouts, or service crashes.

5. **Single point of failure** — If the server processing this loop crashes at student #25,000, there's no record of which students were already notified. Restarting would duplicate notifications for the first 25,000.

### What About the 200 Failed Emails?

Logs show `send_email` failed for 200 students midway. With the current implementation:
- Those 200 students never got their email.
- There's no retry mechanism.
- We don't even know *which* 200 failed unless we parse the logs manually.
- The DB writes and push notifications for those students may or may not have succeeded — it depends on whether the failure was caught.

### Should DB Save and Email Happen Together?

**No.** They should be decoupled. Here's why:

- **DB save is fast and reliable** (~1-5ms, local operation). It should succeed independently of external services.
- **Email sending is slow and unreliable** (~100-500ms, depends on third-party API, can fail due to rate limits, network issues, provider downtime).
- If they happen together and the email fails, you either:
  - Roll back the DB save (student loses the in-app notification too — worse)
  - Keep the DB save but lose track of the failed email (current problem)

**The right approach:** Save to DB first (it's the source of truth), then queue the email as a separate async task that can be retried independently.

### Revised Architecture

```
function notify_all(student_ids: array, message: string):
    # Step 1: Batch insert all notifications to DB
    notification_ids = batch_insert_to_db(student_ids, message)
    
    # Step 2: Push each notification to a message queue
    for each (student_id, notification_id) in zip(student_ids, notification_ids):
        email_queue.enqueue({
            student_id,
            notification_id,
            message,
            type: "email",
            attempts: 0
        })
        push_queue.enqueue({
            student_id,
            notification_id,
            message,
            type: "push"
        })
    
    # Return immediately — HR doesn't wait for 50K emails
    return { status: "queued", total: student_ids.length }


# Workers process the queues independently
function email_worker(job):
    try:
        send_email(job.student_id, job.message)
        mark_email_sent(job.notification_id)
    catch error:
        if job.attempts < 3:
            job.attempts += 1
            email_queue.enqueue(job, delay: exponential_backoff(job.attempts))
        else:
            dead_letter_queue.enqueue(job)
            alert_ops_team(job, error)


function push_worker(job):
    try:
        push_to_app(job.student_id, job.message)
    catch error:
        # push notifications are best-effort — log and move on
        log_failure(job, error)
```

### Key Improvements

| Aspect | Before | After |
|--------|--------|-------|
| **Time for HR** | ~83 minutes (blocking) | ~2 seconds (async, returns immediately) |
| **Failed emails** | Lost forever | Retried 3x with exponential backoff |
| **Unrecoverable failures** | Silent | Routed to dead letter queue + ops alert |
| **DB writes** | One at a time in loop | Batch insert (single query) |
| **Coupling** | All 3 operations tied together | Each runs independently |
| **Server crash mid-process** | Unknown state | Queue persists — workers resume from where they stopped |

### Message Queue Choice

**Bull (Redis-backed)** for Node.js environments:
- Built-in retry with configurable backoff
- Dead letter queue support
- Job progress tracking
- Dashboard for monitoring (Bull Board)
- Handles concurrency — multiple workers can process jobs in parallel

---

## Stage 6 — Priority Inbox Algorithm

### Approach

Priority is determined by a **weighted score** combining notification type importance and recency.

**Type weights:**
- Placement = 3 (most important — directly impacts career)
- Result = 2 (important — academic standing)
- Event = 1 (informational — nice to know)

**Recency factor:** More recent notifications get a higher score. We use a time decay formula:

```
recencyScore = 1 / (1 + hoursAgo * 0.1)
```

This gives recent notifications a score close to 1.0, while older ones decay toward 0. The 0.1 factor controls how fast relevance drops off.

**Final priority score:**
```
priority = typeWeight * recencyScore
```

**Maintaining top 10 efficiently with new notifications:**

When new notifications keep arriving, re-sorting the entire list is wasteful. Instead:
- Maintain a **min-heap** of size N (where N = 10 or whatever the user chooses).
- When a new notification arrives, compute its priority score.
- If the score is higher than the minimum element in the heap, replace it.
- This gives O(log N) insertion instead of O(n log n) re-sorting.

For our implementation (fetching from the API), we:
1. Fetch all notifications from the API
2. Compute priority scores
3. Use a partial sort (selection algorithm) to find top N in O(n) average time
4. Sort only those N items — O(N log N) which is trivial for small N

This is implemented in the backend under `notification_app_be/`.

---

## Stage 7 — Frontend Approach

### Architecture

The frontend is a React application (Vite) with two main views:

1. **All Notifications Page** — Shows every notification from the API, paginated, with type filters.
2. **Priority Inbox Page** — Shows top N most important notifications based on the priority algorithm from Stage 6, with configurable N and type filters.

### New vs Viewed Distinction

Since there's no user authentication or persistent backend state, we use **localStorage** to track which notifications have been viewed:

- When a notification card enters the viewport or is clicked, its ID is stored in localStorage.
- Notifications not in localStorage are visually distinguished with a highlight/badge indicating "New."
- This persists across page refreshes within the same browser.

### Responsive Design

- Desktop: card-based grid layout with sidebar filters
- Mobile: stacked cards with collapsible filter panel
- Breakpoint at 768px

### Tech Stack
- React 18 + Vite
- Vanilla CSS (custom properties for theming)
- Fetch API for HTTP calls
- localStorage for viewed state
- Logging middleware integrated in API calls, components, and hooks
