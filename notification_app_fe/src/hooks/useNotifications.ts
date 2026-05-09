import { useState, useEffect, useCallback } from "react";
import type { AppNotification } from "../api/notifications";
import { fetchAllNotifications, fetchPriorityNotifications } from "../api/notifications";

const VIEWED_KEY = "viewed_notification_ids";

function getViewedIds(): Set<string> {
  try {
    const stored = localStorage.getItem(VIEWED_KEY);
    if (stored) return new Set(JSON.parse(stored));
  } catch {
    // Ignore invalid persisted state and start fresh.
  }
  return new Set();
}

function saveViewedIds(ids: Set<string>): void {
  localStorage.setItem(VIEWED_KEY, JSON.stringify([...ids]));
}

export function markAsViewed(id: string): void {
  const viewed = getViewedIds();
  viewed.add(id);
  saveViewedIds(viewed);
}

export function markAllAsViewed(ids: string[]): void {
  const viewed = getViewedIds();
  ids.forEach((id) => viewed.add(id));
  saveViewedIds(viewed);
}

export function isViewed(id: string): boolean {
  return getViewedIds().has(id);
}

export function useAllNotifications(filterType?: string) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    await Promise.resolve();
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllNotifications({
        type: filterType || undefined,
      });
      setNotifications(data);

      setTimeout(() => {
        markAllAsViewed(data.map((n) => n.ID));
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "something went wrong");
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [load]);

  return { notifications, loading, error, reload: load };
}

export function usePriorityNotifications(topN: number, filterType?: string) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    await Promise.resolve();
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPriorityNotifications(topN, filterType || undefined);
      setNotifications(data);

      setTimeout(() => {
        markAllAsViewed(data.map((n) => n.ID));
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "something went wrong");
    } finally {
      setLoading(false);
    }
  }, [topN, filterType]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [load]);

  return { notifications, loading, error, reload: load };
}
