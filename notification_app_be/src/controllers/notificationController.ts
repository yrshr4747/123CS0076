import { Request, Response } from "express";
import { fetchNotifications } from "../services/notificationService";
import { getTopPriorityNotifications } from "../services/priorityService";
import { Log } from "../utils/logger";

export async function getAllNotifications(req: Request, res: Response): Promise<void> {
  const { limit, page, type } = req.query;

  Log(
    "backend",
    "info",
    "controller",
    `GET /api/notifications — limit=${limit}, page=${page}, type=${type}`
  );

  try {
    const params: Record<string, any> = {};
    if (limit) params.limit = parseInt(limit as string, 10);
    if (page) params.page = parseInt(page as string, 10);
    if (type) params.notification_type = type as string;

    const notifications = await fetchNotifications(params);

    Log(
      "backend",
      "info",
      "controller",
      `successfully fetched ${notifications.length} notifications`
    );

    res.json({
      success: true,
      data: {
        notifications,
        count: notifications.length,
      },
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "unknown error";
    Log("backend", "error", "controller", `failed to fetch notifications: ${errMsg}`);

    res.status(500).json({
      success: false,
      error: "failed to fetch notifications",
    });
  }
}

export async function getPriorityNotifications(req: Request, res: Response): Promise<void> {
  const topN = parseInt((req.query.n as string) || "10", 10);
  const filterType = req.query.type as string | undefined;

  Log(
    "backend",
    "info",
    "controller",
    `GET /api/notifications/priority — topN=${topN}, type=${filterType || "all"}`
  );

  try {
    const allNotifications = await fetchNotifications();

    const prioritized = getTopPriorityNotifications(allNotifications, topN, filterType);

    Log(
      "backend",
      "info",
      "controller",
      `returning ${prioritized.length} priority notifications`
    );

    res.json({
      success: true,
      data: {
        notifications: prioritized,
        count: prioritized.length,
        topN,
      },
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "unknown error";
    Log("backend", "error", "controller", `failed to get priority notifications: ${errMsg}`);

    res.status(500).json({
      success: false,
      error: "failed to compute priority notifications",
    });
  }
}
