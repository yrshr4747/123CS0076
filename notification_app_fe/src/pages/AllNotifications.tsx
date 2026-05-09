import { useState } from "react";
import { useAllNotifications } from "../hooks/useNotifications";
import NotificationList from "../components/NotificationList";
import FilterBar from "../components/FilterBar";

export default function AllNotificationsPage() {
  const [filterType, setFilterType] = useState("");
  const { notifications, loading, error, reload } = useAllNotifications(filterType);

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-title">All Notifications</h1>
        <p className="page-subtitle">
          Browse all campus updates — placements, results, and events.
        </p>
      </div>

      <div className="filters-bar">
        <FilterBar activeType={filterType} onTypeChange={setFilterType} />
      </div>

      <NotificationList
        notifications={notifications}
        loading={loading}
        error={error}
        onRetry={reload}
      />
    </div>
  );
}
