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

// Bind original console methods directly (since console is not enumerable)
const origConsole = {
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
  if ((window as any).__telemetryPatched) return;
  (window as any).__telemetryPatched = true;

  console.log = (...args) => {
    origConsole.log(...args);
    addEntry("info", args.map(serializeArg).join(" "));
  };
  console.warn = (...args) => {
    origConsole.warn(...args);
    addEntry("warn", args.map(serializeArg).join(" "));
  };
  console.error = (...args) => {
    origConsole.error(...args);
    addEntry("error", args.map(serializeArg).join(" "));
  };
  console.debug = (...args) => {
    origConsole.debug(...args);
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
  if (typeof window === "undefined") return;
  if ((window as any).__telemetryFetchPatched) return;
  (window as any).__telemetryFetchPatched = true;

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
  if ((window as any).__telemetryNavPatched) return;
  (window as any).__telemetryNavPatched = true;

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
