import express from "express";
import cors from "cors";
import config from "./config";
import { configure, Log } from "./utils/logger";
import { requestLogger } from "./middleware/requestLogger";
import notificationRoutes from "./routes/notifications";

configure({
  email: config.auth.email,
  name: config.auth.name,
  rollNo: config.auth.rollNo,
  accessCode: config.auth.accessCode,
  clientID: config.auth.clientID,
  clientSecret: config.auth.clientSecret,
});

const app = express();

app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.use("/api/notifications", notificationRoutes);

app.get("/api/health", (_req, res) => {
  Log("backend", "debug", "controller", "health check hit");
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(config.port, () => {
  Log(
    "backend",
    "info",
    "config",
    `server started on port ${config.port}`
  );
  console.log(`Backend running at http://localhost:${config.port}`);
});

export default app;
