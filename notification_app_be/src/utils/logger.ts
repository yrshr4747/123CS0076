import axios, { AxiosError } from "axios";

type Stack = "backend" | "frontend";
type Level = "debug" | "info" | "warn" | "error" | "fatal";

interface AuthConfig {
  email: string;
  name: string;
  rollNo: string;
  accessCode: string;
  clientID: string;
  clientSecret: string;
}

interface LogPayload {
  stack: string;
  level: string;
  package: string;
  message: string;
}

const VALID_STACKS: Stack[] = ["backend", "frontend"];
const VALID_LEVELS: Level[] = ["debug", "info", "warn", "error", "fatal"];
const BACKEND_PACKAGES = ["cache", "controller", "cron_job", "db", "domain", "handler", "repository", "route", "service"];
const FRONTEND_PACKAGES = ["api", "component", "hook", "page", "state", "style"];
const SHARED_PACKAGES = ["auth", "config", "middleware", "utils"];
const ALL_PACKAGES = [...BACKEND_PACKAGES, ...FRONTEND_PACKAGES, ...SHARED_PACKAGES];

function validate(stack: string, level: string, pkg: string, msg: string): string | null {
  if (!stack || !level || !pkg || !msg) return "all parameters required";
  if (!VALID_STACKS.includes(stack as Stack)) return `invalid stack: ${stack}`;
  if (!VALID_LEVELS.includes(level as Level)) return `invalid level: ${level}`;
  if (!ALL_PACKAGES.includes(pkg)) return `invalid package: ${pkg}`;
  if (stack === "backend" && FRONTEND_PACKAGES.includes(pkg)) return `${pkg} is frontend-only`;
  if (stack === "frontend" && BACKEND_PACKAGES.includes(pkg)) return `${pkg} is backend-only`;
  return null;
}

const LOG_API = "http://4.224.186.213/evaluation-service/logs";
const AUTH_API = "http://4.224.186.213/evaluation-service/auth";

let token: string | null = null;
let tokenExpiry: number = 0;
let authCfg: AuthConfig | null = null;

export function configure(config: AuthConfig): void {
  authCfg = config;
  token = null;
  tokenExpiry = 0;
}

async function getToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (token && tokenExpiry > now + 60) return token;

  if (!authCfg) throw new Error("logger not configured — call configure() first");

  const resp = await axios.post(AUTH_API, {
    email: authCfg.email,
    name: authCfg.name,
    rollNo: authCfg.rollNo,
    accessCode: authCfg.accessCode,
    clientID: authCfg.clientID,
    clientSecret: authCfg.clientSecret,
  });

  token = resp.data.access_token;
  tokenExpiry = resp.data.expires_in;
  return token!;
}

export async function Log(
  stack: string,
  level: string,
  pkg: string,
  message: string
): Promise<void> {
  const err = validate(stack, level, pkg, message);
  if (err) {
    console.error(`[Log] validation: ${err}`);
    return;
  }

  const payload: LogPayload = { stack, level, package: pkg, message };

  try {
    const t = await getToken();
    await axios.post(LOG_API, payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${t}`,
      },
      timeout: 5000,
    });
  } catch (e) {
    try {
      token = null;
      const fresh = await getToken();
      await axios.post(LOG_API, payload, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${fresh}`,
        },
        timeout: 5000,
      });
    } catch (retryErr) {
      const ax = retryErr as AxiosError;
      console.error(`[Log] failed after retry: ${ax.message}`);
    }
  }
}
