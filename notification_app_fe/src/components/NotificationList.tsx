import type { AppNotification } from "../api/notifications";
import NotificationCard from "./NotificationCard";

interface NotificationListProps {
  notifications: AppNotification[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  showScores?: boolean;
}

export default function NotificationList({
  notifications,
  loading,
  error,
  onRetry,
  showScores = false,
}: NotificationListProps) {
  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <p className="loading-text">Loading notifications...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p className="error-text">{error}</p>
        <button className="retry-btn" onClick={onRetry}>
          Try Again
        </button>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="empty-container">
        <div className="empty-icon">📭</div>
        <p className="empty-text">No notifications found</p>
      </div>
    );
  }

  return (
    <div className="notification-list">
      {notifications.map((n) => (
        <NotificationCard
          key={n.ID}
          notification={n}
          showScore={showScores}
        />
      ))}
    </div>
  );
}
