import type { AppNotification } from "../api/notifications";
import { isViewed } from "../hooks/useNotifications";

function timeAgo(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return new Date(timestamp).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface NotificationCardProps {
  notification: AppNotification;
  showScore?: boolean;
}

export default function NotificationCard({
  notification,
  showScore = false,
}: NotificationCardProps) {
  const viewed = isViewed(notification.ID);
  const typeClass = notification.Type.toLowerCase();

  return (
    <div className={`notification-card ${!viewed ? "is-new" : ""}`}>
      <div className="card-top-row">
        <span className={`type-badge ${typeClass}`}>{notification.Type}</span>
        <span className="card-timestamp">{timeAgo(notification.Timestamp)}</span>
      </div>
      <p className="card-message">{notification.Message}</p>
      {showScore && notification.priorityScore !== undefined && (
        <p className="priority-score">
          priority: {notification.priorityScore.toFixed(4)}
        </p>
      )}
    </div>
  );
}
