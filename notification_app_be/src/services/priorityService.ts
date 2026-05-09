import { ExternalNotification } from "../services/notificationService";
import { Log } from "../utils/logger";

const TYPE_WEIGHTS: Record<string, number> = {
  Placement: 3,
  Result: 2,
  Event: 1,
};

interface ScoredNotification extends ExternalNotification {
  priorityScore: number;
}

function calculateScore(notification: ExternalNotification): number {
  const typeWeight = TYPE_WEIGHTS[notification.Type] || 1;

  const notifTime = new Date(notification.Timestamp).getTime();
  const now = Date.now();
  const hoursAgo = Math.max(0, (now - notifTime) / (1000 * 60 * 60));

  const recencyFactor = 1 / (1 + hoursAgo * 0.1);

  return typeWeight * recencyFactor;
}

export function getTopPriorityNotifications(
  notifications: ExternalNotification[],
  topN: number = 10,
  filterType?: string
): ScoredNotification[] {
  Log(
    "backend",
    "info",
    "service",
    `computing priority for ${notifications.length} notifications, topN=${topN}, filter=${filterType || "none"}`
  );

  let filtered = notifications;

  if (filterType) {
    filtered = notifications.filter(
      (n) => n.Type.toLowerCase() === filterType.toLowerCase()
    );
    Log(
      "backend",
      "debug",
      "service",
      `filtered to ${filtered.length} notifications of type "${filterType}"`
    );
  }

  const scored: ScoredNotification[] = filtered.map((n) => ({
    ...n,
    priorityScore: parseFloat(calculateScore(n).toFixed(4)),
  }));

  scored.sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) {
      return b.priorityScore - a.priorityScore;
    }
    return new Date(b.Timestamp).getTime() - new Date(a.Timestamp).getTime();
  });

  const topItems = scored.slice(0, topN);

  Log(
    "backend",
    "info",
    "service",
    `returning top ${topItems.length} priority notifications (highest score: ${topItems[0]?.priorityScore || 0})`
  );

  return topItems;
}
