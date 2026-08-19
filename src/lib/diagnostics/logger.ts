type LogEntry = {
  id: string;
  level: "info" | "warn" | "error" | "debug";
  message: string;
  data?: unknown;
  timestamp: string;
  url?: string;
  userAgent?: string;
};

const STORAGE_KEY = "thaibahive_telemetry";
const MAX_LOGS = 500;

function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function loadLogs(): LogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLogs(logs: LogEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs.slice(-MAX_LOGS)));
  } catch {
    // localStorage full — clear oldest half
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(logs.slice(-Math.floor(MAX_LOGS / 2))));
    } catch {}
  }
}

let isAddingEntry = false;

function addEntry(level: LogEntry["level"], message: string, data?: unknown) {
  if (isAddingEntry) return;
  isAddingEntry = true;
  try {
    const logs = loadLogs();
    const entry: LogEntry = {
      id: generateUUID(),
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
      url: typeof window !== "undefined" ? window.location.href : undefined,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    };
    logs.push(entry);
    saveLogs(logs);
    return entry;
  } catch {
    // Suppress console writes during error to prevent loop
  } finally {
    isAddingEntry = false;
  }
}

// ---------------------------------------------------------------------------
// Console patching
// ---------------------------------------------------------------------------

// Save references to initial console methods
const rawConsole = {
  log: typeof console !== "undefined" ? console.log.bind(console) : () => {},
  warn: typeof console !== "undefined" ? console.warn.bind(console) : () => {},
  error: typeof console !== "undefined" ? console.error.bind(console) : () => {},
  debug: typeof console !== "undefined" ? console.debug.bind(console) : () => {},
};

function serializeArg(arg: unknown): string {
  if (arg instanceof Error) return `${arg.name}: ${arg.message}`;
  if (typeof arg === "object" && arg !== null) {
    try { return JSON.stringify(arg); } catch { return String(arg); }
  }
  return String(arg);
}

function patchConsole() {
  if (typeof window === "undefined") return;
  if ((window as unknown as Record<string, unknown>).__telemetryPatched) return;
  (window as unknown as Record<string, unknown>).__telemetryPatched = true;

  console.log = (...args) => {
    rawConsole.log(...args);
    addEntry("info", args.map(serializeArg).join(" "));
  };
  console.warn = (...args) => {
    rawConsole.warn(...args);
    addEntry("warn", args.map(serializeArg).join(" "));
  };
  console.error = (...args) => {
    rawConsole.error(...args);
    addEntry("error", args.map(serializeArg).join(" "));
  };
  console.debug = (...args) => {
    rawConsole.debug(...args);
    addEntry("debug", args.map(serializeArg).join(" "));
  };

  window.onerror = (_msg, _url, _line, _col, error) => {
    addEntry("error", error?.message || String(_msg), { url: _url, line: _line, stack: error?.stack });
  };
  window.onunhandledrejection = (event) => {
    addEntry("error", `Unhandled Promise rejection: ${event.reason}`, { stack: event.reason?.stack });
  };
}

// ---------------------------------------------------------------------------
// Fetch interception — log every API call with method, status, and duration
// ---------------------------------------------------------------------------

function patchFetch() {
  if (typeof window === "undefined" || typeof window.fetch !== "function") return;
  if ((window as unknown as Record<string, unknown>).__telemetryFetchPatched) return;
  (window as unknown as Record<string, unknown>).__telemetryFetchPatched = true;

  const origFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const method = (init?.method ?? "GET").toUpperCase();
    const url = typeof input === "string"
      ? input
      : input instanceof URL
      ? input.toString()
      : (input as Request).url;

    // Only instrument relative paths and same-origin requests (i.e. our own API)
    const isInternal = url.startsWith("/") || url.startsWith(window.location.origin);
    const t0 = performance.now();

    try {
      const response = await origFetch(input, init);
      const duration = Math.round(performance.now() - t0);
      const level = response.ok ? "info" : response.status >= 500 ? "error" : "warn";

      if (isInternal) {
        addEntry(level, `${method} ${url} → ${response.status} (${duration}ms)`, {
          status: response.status,
          duration,
          ...(response.ok ? {} : { slow: duration > 3000 }),
        });
      }

      return response;
    } catch (err: unknown) {
      const duration = Math.round(performance.now() - t0);
      if (isInternal) {
        addEntry("error", `${method} ${url} → NETWORK ERROR (${duration}ms)`, {
          error: err instanceof Error ? err.message : String(err),
          duration,
        });
      }
      throw err;
    }
  };
}

// ---------------------------------------------------------------------------
// Navigation tracking — log every page visit (Next.js router + browser nav)
// ---------------------------------------------------------------------------

function patchNavigation() {
  if (typeof window === "undefined") return;
  if ((window as unknown as Record<string, unknown>).__telemetryNavPatched) return;
  (window as unknown as Record<string, unknown>).__telemetryNavPatched = true;

  function recordNav(path: string) {
    addEntry("info", `NAV → ${path}`);
  }

  // SPA navigations via History API (Next.js App Router uses these)
  const origPushState = history.pushState.bind(history);
  const origReplaceState = history.replaceState.bind(history);

  history.pushState = (...args) => {
    origPushState(...args);
    recordNav(window.location.pathname);
  };
  history.replaceState = (...args) => {
    origReplaceState(...args);
    recordNav(window.location.pathname);
  };

  // Browser back/forward
  window.addEventListener("popstate", () => recordNav(window.location.pathname));
}

// ---------------------------------------------------------------------------
// Initialise everything at module-load time (client only)
// ---------------------------------------------------------------------------

if (typeof window !== "undefined") {
  patchConsole();
  patchFetch();
  patchNavigation();
  // Record a session start marker so we know when the logger activated
  addEntry("info", `[telemetry] Session started — ThaibaHive v${process.env.NEXT_PUBLIC_APP_VERSION ?? "dev"}`);
}

export const telemetry = {
  /** @deprecated Patching is now automatic at module load. Kept for backward compat. */
  patchConsole,
  info: (message: string, data?: unknown) => addEntry("info", message, data),
  warn: (message: string, data?: unknown) => addEntry("warn", message, data),
  error: (message: string, data?: unknown) => addEntry("error", message, data),
  debug: (message: string, data?: unknown) => addEntry("debug", message, data),
  getLogs: (): LogEntry[] => loadLogs(),
  clearLogs: () => { try { localStorage.removeItem(STORAGE_KEY); } catch {} },
  getDiagnosticDump: (): string => {
    const logs = loadLogs();
    const lines = [
      "=== ThaibaHive Diagnostic Report ===",
      `Generated: ${new Date().toISOString()}`,
      `User Agent: ${typeof navigator !== "undefined" ? navigator.userAgent : "N/A"}`,
      `URL: ${typeof window !== "undefined" ? window.location.href : "N/A"}`,
      `Log Count: ${logs.length}`,
      "",
      "--- Captured Logs ---",
      ...logs.map((l) => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.message}${l.data ? ` | ${JSON.stringify(l.data)}` : ""}`),
      "",
      "--- End of Report ---",
    ];
    return lines.join("\n");
  },
};

// ---------------------------------------------------------------------------
// Structured Logging Engine (Server & Client Compatible)
// ---------------------------------------------------------------------------

export type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const SENSITIVE_KEYS = /password|token|secret|authorization|cookie|creditcard/i;

function maskSensitiveData(value: unknown, seen = new WeakSet()): unknown {
  if (value === null || value === undefined) return value;

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  if (typeof value === "bigint") return value.toString();

  if (typeof value === "object") {
    if (seen.has(value)) return "[Circular]";
    seen.add(value);

    if (Array.isArray(value)) {
      return value.map((item) => maskSensitiveData(item, seen));
    }

    const sanitized: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.test(k)) {
        sanitized[k] = "[REDACTED]";
      } else {
        sanitized[k] = maskSensitiveData(v, seen);
      }
    }
    return sanitized;
  }

  return value;
}

export interface StructuredLogPayload {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: unknown;
}

function safeJsonStringify(obj: unknown): string {
  try {
    const masked = maskSensitiveData(obj);
    return JSON.stringify(masked);
  } catch {
    return String(obj);
  }
}

export const logger = {
  info(message: string, data?: unknown) {
    this._log("info", message, data);
  },
  warn(message: string, data?: unknown) {
    this._log("warn", message, data);
  },
  error(message: string, data?: unknown) {
    this._log("error", message, data);
  },
  debug(message: string, data?: unknown) {
    this._log("debug", message, data);
  },

  _log(level: LogLevel, message: string, data?: unknown) {
    const isProd = process.env.NODE_ENV === "production" || process.env.LOG_FORMAT === "json";
    const minLevel: LogLevel = isProd && process.env.DEBUG !== "true" ? "info" : "debug";

    if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[minLevel]) {
      return;
    }

    const payload: StructuredLogPayload = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(data !== undefined ? { data: maskSensitiveData(data) } : {}),
    };

    if (isProd) {
      const output = safeJsonStringify(payload);
      if (level === "error") {
        console.error(output);
      } else if (level === "warn") {
        console.warn(output);
      } else {
        console.log(output);
      }
    } else {
      const prefix = `[${payload.timestamp}] [${level.toUpperCase()}]`;
      if (level === "error") {
        console.error(prefix, message, data ?? "");
      } else if (level === "warn") {
        console.warn(prefix, message, data ?? "");
      } else if (level === "debug") {
        console.debug(prefix, message, data ?? "");
      } else {
        console.log(prefix, message, data ?? "");
      }
    }
  },
};

