import { Request, Response, NextFunction } from "express";
import { Log } from "../utils/logger";

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  Log(
    "backend",
    "info",
    "middleware",
    `incoming ${req.method} ${req.path} — query: ${JSON.stringify(req.query)}`
  );

  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const level = res.statusCode >= 400 ? "error" : "info";

    Log(
      "backend",
      level,
      "middleware",
      `${req.method} ${req.path} → ${res.statusCode} (${duration}ms)`
    );
  });

  next();
}
