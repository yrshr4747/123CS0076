import { useState } from "react";
import AllNotificationsPage from "./pages/AllNotifications";
import PriorityInboxPage from "./pages/PriorityInbox";
import "./index.css";

type Page = "all" | "priority";

function App() {
  const [activePage, setActivePage] = useState<Page>("all");

  return (
    <>
      <header className="app-header">
        <div className="header-inner">
          <h1 className="header-title">
            Campus <span>Notify</span>
          </h1>

          <nav className="nav-tabs">
            <button
              className={`nav-tab ${activePage === "all" ? "active" : ""}`}
              onClick={() => setActivePage("all")}
            >
              All Notifications
            </button>
            <button
              className={`nav-tab ${activePage === "priority" ? "active" : ""}`}
              onClick={() => setActivePage("priority")}
            >
              Priority Inbox
            </button>
          </nav>
        </div>
      </header>

      <main className="app-container">
        {activePage === "all" ? <AllNotificationsPage /> : <PriorityInboxPage />}
      </main>
    </>
  );
}

export default App;
