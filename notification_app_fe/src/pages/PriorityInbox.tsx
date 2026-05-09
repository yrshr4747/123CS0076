import { useState } from "react";
import { usePriorityNotifications } from "../hooks/useNotifications";
import NotificationList from "../components/NotificationList";
import FilterBar from "../components/FilterBar";

const TOP_N_OPTIONS = [5, 10, 15, 20, 25];

export default function PriorityInboxPage() {
  const [topN, setTopN] = useState(10);
  const [filterType, setFilterType] = useState("");
  const { notifications, loading, error, reload } = usePriorityNotifications(
    topN,
    filterType
  );

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-title">Priority Inbox</h1>
        <p className="page-subtitle">
          Top notifications ranked by importance and recency.
        </p>
      </div>

      <div className="filters-bar">
        <FilterBar activeType={filterType} onTypeChange={setFilterType} />

        <div className="top-n-selector">
          <label htmlFor="topN">Show top</label>
          <select
            id="topN"
            value={topN}
            onChange={(e) => setTopN(parseInt(e.target.value, 10))}
          >
            {TOP_N_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      <NotificationList
        notifications={notifications}
        loading={loading}
        error={error}
        onRetry={reload}
        showScores
      />
    </div>
  );
}
