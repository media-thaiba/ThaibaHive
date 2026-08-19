import { env } from "@/lib/env";

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  url?: string;
  requestId?: string;
}

const levelOrder: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const minLevel = env.NODE_ENV === "production" ? "info" : "debug";

function shouldLog(level: LogLevel): boolean {
  return levelOrder[level] >= levelOrder[minLevel];
}

function formatLogEntry(entry: LogEntry): string {
  const base = `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}`;
  const extra: string[] = [];
  if (entry.requestId) extra.push(`req=${entry.requestId}`);
  if (entry.url) extra.push(`url=${entry.url}`);
  if (entry.context) {
    try {
      const ctxStr = JSON.stringify(entry.context);
      if (ctxStr !== "{}") extra.push(`ctx=${ctxStr}`);
    } catch {
      extra.push("ctx=[unserializable]");
    }
  }
  return extra.length > 0 ? `${base} ${extra.join(" ")}` : base;
}

function log(level: LogLevel, message: string, context?: LogContext, url?: string, requestId?: string): void {
  if (!shouldLog(level)) return;

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
    url,
    requestId,
  };

  const formatted = formatLogEntry(entry);

  if (level === "error") {
    console.error(formatted);
  } else if (level === "warn") {
    console.warn(formatted);
  } else if (level === "debug") {
    console.debug(formatted);
  } else {
    console.log(formatted);
  }
}

export const serverLogger = {
  debug: (message: string, context?: LogContext, url?: string, requestId?: string) =>
    log("debug", message, context, url, requestId),
  info: (message: string, context?: LogContext, url?: string, requestId?: string) =>
    log("info", message, context, url, requestId),
  warn: (message: string, context?: LogContext, url?: string, requestId?: string) =>
    log("warn", message, context, url, requestId),
  error: (message: string, context?: LogContext, url?: string, requestId?: string) =>
    log("error", message, context, url, requestId),
};
