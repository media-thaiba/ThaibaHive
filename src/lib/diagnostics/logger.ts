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
  } catch (err) {
    // Suppress console writes during error to prevent loop
  } finally {
    isAddingEntry = false;
  }
}

// Bind original console methods directly (since console is not enumerable)
const origConsole = {
  log: typeof console !== "undefined" ? console.log.bind(console) : () => {},
  warn: typeof console !== "undefined" ? console.warn.bind(console) : () => {},
  error: typeof console !== "undefined" ? console.error.bind(console) : () => {},
  debug: typeof console !== "undefined" ? console.debug.bind(console) : () => {},
};

function patchConsole() {
  if (typeof window === "undefined") return;
  if ((window as any).__telemetryPatched) return;
  (window as any).__telemetryPatched = true;

  console.log = (...args) => {
    origConsole.log(...args);
    addEntry("info", args.map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : String(arg))).join(" "));
  };
  console.warn = (...args) => {
    origConsole.warn(...args);
    addEntry("warn", args.map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : String(arg))).join(" "));
  };
  console.error = (...args) => {
    origConsole.error(...args);
    addEntry("error", args.map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : String(arg))).join(" "));
  };
  console.debug = (...args) => {
    origConsole.debug(...args);
    addEntry("debug", args.map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : String(arg))).join(" "));
  };

  window.onerror = (_msg, _url, _line, _col, error) => {
    addEntry("error", error?.message || String(_msg), { url: _url, line: _line, stack: error?.stack });
  };
  window.onunhandledrejection = (event) => {
    addEntry("error", `Unhandled Promise rejection: ${event.reason}`, { stack: event.reason?.stack });
  };
}

export const telemetry = {
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
