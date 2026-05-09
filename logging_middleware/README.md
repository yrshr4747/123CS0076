# Logging Middleware

Reusable logging package for the campus notification platform. Sends structured log entries to the evaluation server with automatic auth token management.

## Usage

```typescript
import { configure, Log } from "../logging_middleware";

// configure once at startup
configure({
  email: process.env.AUTH_EMAIL,
  name: process.env.AUTH_NAME,
  rollNo: process.env.AUTH_ROLL_NO,
  accessCode: process.env.AUTH_ACCESS_CODE,
  clientID: process.env.AUTH_CLIENT_ID,
  clientSecret: process.env.AUTH_CLIENT_SECRET,
});

// log throughout your code
await Log("backend", "info", "controller", "fetched 20 notifications for student dashboard");
await Log("backend", "error", "db", "connection pool exhausted — retrying in 5s");
```

## Function Signature

```
Log(stack, level, package, message)
```

### Parameters

| Param | Type | Values |
|-------|------|--------|
| `stack` | string | `backend`, `frontend` |
| `level` | string | `debug`, `info`, `warn`, `error`, `fatal` |
| `package` | string | See below |
| `message` | string | Descriptive context |

### Package Values

**Backend only:** `cache`, `controller`, `cron_job`, `db`, `domain`
**Frontend only:** `api`, `component`, `hook`, `page`, `state`, `style`
**Both:** `auth`, `config`, `middleware`, `utils`
