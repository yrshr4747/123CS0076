# Campus Notification Platform

A full-stack campus notification platform that delivers real-time updates to students regarding **Placements**, **Events**, and **Results**.

## Project Structure

```
├── logging_middleware/          → Reusable logging package (TypeScript)
├── notification_system_design.md → System design document (Stages 1-7)
├── notification_app_be/         → Express backend with priority algorithm
├── notification_app_fe/         → React frontend (Vite)
└── .gitignore
```

## Quick Start

### 1. Logging Middleware (build first)

```bash
cd logging_middleware
npm install
npm run build
```

### 2. Backend

```bash
cd notification_app_be
npm install
cp .env.example .env   # fill in your credentials
npm run dev
```

Runs on `http://localhost:5000`

### 3. Frontend

```bash
cd notification_app_fe
npm install
npm run dev
```

Runs on `http://localhost:3000`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | All notifications (supports `type`, `limit`, `page` query params) |
| GET | `/api/notifications/priority` | Top N priority notifications (supports `n`, `type` query params) |
| GET | `/api/health` | Health check |

## Tech Stack

- **Frontend:** React 18, Vite, TypeScript, Vanilla CSS
- **Backend:** Express.js, TypeScript
- **Logging:** Custom middleware posting to evaluation server
- **Priority Algorithm:** Weighted scoring (type importance × recency decay)
