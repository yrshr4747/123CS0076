# Campus Notification Platform

Full stack notification system for campus updates - placements, results, events.

## Setup

### Logging Middleware
```bash
cd logging_middleware
npm install
npm run build
```

### Backend
```bash
cd notification_app_be
npm install
cp .env.example .env    # add your credentials
npm run dev
```
Runs on http://localhost:5001

### Frontend
```bash
cd notification_app_fe
npm install
npm run dev
```
Runs on http://localhost:3000

## API

- `GET /api/notifications` - all notifications (query params: type, limit, page)
- `GET /api/notifications/priority?n=10` - top N by priority score
- `GET /api/health` - health check

## Tech Stack
- React + Vite + TypeScript (frontend)
- Express + TypeScript (backend)
- Vanilla CSS
