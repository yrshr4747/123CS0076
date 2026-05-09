import axios, { AxiosError } from "axios";
import config from "../config";
import { Log } from "../utils/logger";

const AUTH_URL = config.externalApi.authUrl;
const NOTIFICATIONS_URL = config.externalApi.notificationsUrl;

let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

export interface ExternalNotification {
  ID: string;
  Type: "Event" | "Result" | "Placement";
  Message: string;
  Timestamp: string;
}

async function getToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  if (cachedToken && tokenExpiresAt > now + 60) {
    return cachedToken;
  }

  Log("backend", "info", "auth", "fetching fresh auth token from evaluation server");

  try {
    const resp = await axios.post(AUTH_URL, {
      email: config.auth.email,
      name: config.auth.name,
      rollNo: config.auth.rollNo,
      accessCode: config.auth.accessCode,
      clientID: config.auth.clientID,
      clientSecret: config.auth.clientSecret,
    });

    cachedToken = resp.data.access_token;
    tokenExpiresAt = resp.data.expires_in;

    Log("backend", "info", "auth", `auth token obtained, expires at ${tokenExpiresAt}`);
    return cachedToken!;
  } catch (err) {
    const axErr = err as AxiosError;
    Log("backend", "error", "auth", `failed to get auth token: ${axErr.message}`);
    throw new Error("could not authenticate with evaluation server");
  }
}

export async function fetchNotifications(params?: {
  limit?: number;
  page?: number;
  notification_type?: string;
}): Promise<ExternalNotification[]> {
  const token = await getToken();

  Log(
    "backend",
    "info",
    "service",
    `fetching notifications with params: ${JSON.stringify(params || {})}`
  );

  try {
    const resp = await axios.get(NOTIFICATIONS_URL, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: params || {},
      timeout: 10000,
    });

    const notifications: ExternalNotification[] = resp.data.notifications || [];

    Log(
      "backend",
      "info",
      "service",
      `received ${notifications.length} notifications from evaluation API`
    );

    return notifications;
  } catch (err) {
    const axErr = err as AxiosError;

    if (axErr.response?.status === 401) {
      Log("backend", "warn", "service", "token expired mid-request, refreshing and retrying");
      cachedToken = null;
      const freshToken = await getToken();

      const retryResp = await axios.get(NOTIFICATIONS_URL, {
        headers: { Authorization: `Bearer ${freshToken}` },
        params: params || {},
        timeout: 10000,
      });

      return retryResp.data.notifications || [];
    }

    Log(
      "backend",
      "error",
      "service",
      `failed to fetch notifications: ${axErr.message}`
    );
    throw new Error("could not fetch notifications from evaluation server");
  }
}
