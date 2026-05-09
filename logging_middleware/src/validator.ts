import { Stack, Level, Package } from "./types";

const VALID_STACKS: Stack[] = ["backend", "frontend"];
const VALID_LEVELS: Level[] = ["debug", "info", "warn", "error", "fatal"];

const BACKEND_ONLY_PACKAGES = ["cache", "controller", "cron_job", "db", "domain", "handler", "repository", "route", "service"];
const FRONTEND_ONLY_PACKAGES = ["api", "component", "hook", "page", "state", "style"];
const SHARED_PACKAGES = ["auth", "config", "middleware", "utils"];

const ALL_PACKAGES = [
  ...BACKEND_ONLY_PACKAGES,
  ...FRONTEND_ONLY_PACKAGES,
  ...SHARED_PACKAGES,
];

export function isValidStack(stack: string): stack is Stack {
  return VALID_STACKS.includes(stack as Stack);
}

export function isValidLevel(level: string): level is Level {
  return VALID_LEVELS.includes(level as Level);
}

export function isValidPackage(pkg: string, stack: Stack): boolean {
  if (!ALL_PACKAGES.includes(pkg)) {
    return false;
  }

  if (stack === "backend" && FRONTEND_ONLY_PACKAGES.includes(pkg)) {
    return false;
  }

  if (stack === "frontend" && BACKEND_ONLY_PACKAGES.includes(pkg)) {
    return false;
  }

  return true;
}

export function validateLogParams(
  stack: string,
  level: string,
  pkg: string,
  message: string
): string | null {
  if (!stack || !level || !pkg || !message) {
    return "all four parameters (stack, level, package, message) are required";
  }

  if (!isValidStack(stack)) {
    return `invalid stack "${stack}" — must be one of: ${VALID_STACKS.join(", ")}`;
  }

  if (!isValidLevel(level)) {
    return `invalid level "${level}" — must be one of: ${VALID_LEVELS.join(", ")}`;
  }

  if (!isValidPackage(pkg, stack)) {
    const allowed =
      stack === "backend"
        ? [...BACKEND_ONLY_PACKAGES, ...SHARED_PACKAGES]
        : [...FRONTEND_ONLY_PACKAGES, ...SHARED_PACKAGES];
    return `invalid package "${pkg}" for stack "${stack}" — must be one of: ${allowed.join(", ")}`;
  }

  return null;
}
