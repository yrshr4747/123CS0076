const API_BASE = "/api";

export interface AppNotification {
  ID: string;
  Type: "Event" | "Result" | "Placement";
  Message: string;
  Timestamp: string;
  priorityScore?: number;
}

interface NotificationsResponse {
  success: boolean;
  data: {
    notifications: AppNotification[];
    count: number;
    topN?: number;
  };
}

export async function fetchAllNotifications(params?: {
  type?: string;
  limit?: number;
  page?: number;
}): Promise<AppNotification[]> {
  const searchParams = new URLSearchParams();
  if (params?.type) searchParams.set("type", params.type);
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.page) searchParams.set("page", String(params.page));

  const url = `${API_BASE}/notifications?${searchParams.toString()}`;

  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`failed to fetch notifications: ${resp.status}`);
  }

  const data: NotificationsResponse = await resp.json();
  return data.data.notifications;
}

export async function fetchPriorityNotifications(
  topN: number = 10,
  filterType?: string
): Promise<AppNotification[]> {
  const searchParams = new URLSearchParams();
  searchParams.set("n", String(topN));
  if (filterType) searchParams.set("type", filterType);

  const url = `${API_BASE}/notifications/priority?${searchParams.toString()}`;

  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`failed to fetch priority notifications: ${resp.status}`);
  }

  const data: NotificationsResponse = await resp.json();
  return data.data.notifications;
}
