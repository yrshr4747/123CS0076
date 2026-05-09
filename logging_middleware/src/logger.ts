import axios, { AxiosError } from "axios";
import { LogPayload, LogResponse, AuthResponse, AuthConfig } from "./types";
import { validateLogParams } from "./validator";

const LOG_API_URL = "http://4.224.186.213/evaluation-service/logs";
const AUTH_API_URL = "http://4.224.186.213/evaluation-service/auth";

let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;
let authConfig: AuthConfig | null = null;

export function configure(config: AuthConfig): void {
  authConfig = config;
  cachedToken = null;
  tokenExpiresAt = 0;
}

async function getAuthToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && tokenExpiresAt > now + 60) {
    return cachedToken;
  }

  if (!authConfig) {
    throw new Error(
      "Logger not configured — call configure() with your auth credentials first"
    );
  }

  try {
    const resp = await axios.post<AuthResponse>(AUTH_API_URL, {
      email: authConfig.email,
      name: authConfig.name,
      rollNo: authConfig.rollNo,
      accessCode: authConfig.accessCode,
      clientID: authConfig.clientID,
      clientSecret: authConfig.clientSecret,
    });

    cachedToken = resp.data.access_token;
    tokenExpiresAt = resp.data.expires_in;

    return cachedToken;
  } catch (err) {
    const axiosErr = err as AxiosError;
    const status = axiosErr.response?.status || "unknown";
    throw new Error(`failed to obtain auth token (HTTP ${status})`);
  }
}

export async function Log(
  stack: string,
  level: string,
  pkg: string,
  message: string
): Promise<LogResponse | null> {
  const validationError = validateLogParams(stack, level, pkg, message);
  if (validationError) {
    console.error(`[LogMiddleware] validation failed: ${validationError}`);
    return null;
  }

  const payload: LogPayload = {
    stack: stack as LogPayload["stack"],
    level: level as LogPayload["level"],
    package: pkg,
    message,
  };

  try {
    const token = await getAuthToken();

    const resp = await axios.post<LogResponse>(LOG_API_URL, payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      timeout: 5000,
    });

    return resp.data;
  } catch (err) {
    try {
      cachedToken = null;
      const freshToken = await getAuthToken();

      const resp = await axios.post<LogResponse>(LOG_API_URL, payload, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${freshToken}`,
        },
        timeout: 5000,
      });

      return resp.data;
    } catch (retryErr) {
      const axiosErr = retryErr as AxiosError;
      console.error(
        `[LogMiddleware] failed to send log after retry — ${axiosErr.message}`
      );
      return null;
    }
  }
}
