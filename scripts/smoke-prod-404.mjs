#!/usr/bin/env node
/**
 * Production fixture gate.
 * Place at: scripts/smoke-prod-404.mjs
 * Add to package.json:  "smoke:prod-404": "node scripts/smoke-prod-404.mjs"
 *
 * Proves that a NORMAL production build does not expose the E2E fixture routes
 * (/dev/sheet-harness and anything else under /dev/).
 *
 * Usage
 *   Local / CI (spawns the standalone server itself):
 *     pnpm build && node scripts/smoke-prod-404.mjs
 *   Against an already-running deployment or container:
 *     SMOKE_BASE_URL=https://staging.example.com node scripts/smoke-prod-404.mjs
 *
 * Env (all optional)
 *   SMOKE_PORT              port for the spawned server (default 3199)
 *   SMOKE_SERVER            path to server.js (default .next/standalone/server.js)
 *   SMOKE_CONTROL_PATH      a real route that must NOT 404 (default "/")
 *   SMOKE_READY_TIMEOUT_MS  how long to wait for the server (default 90000)
 *
 * Exit code 0 = gate passed, 1 = gate failed (or could not be evaluated).
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const PORT = process.env.SMOKE_PORT ?? "3199";
const EXTERNAL = Boolean(process.env.SMOKE_BASE_URL);
const BASE = (process.env.SMOKE_BASE_URL ?? `http://127.0.0.1:${PORT}`).replace(/\/$/, "");
const SERVER_JS =
  process.env.SMOKE_SERVER ?? path.join(".next", "standalone", "server.js");
const CONTROL_PATH = process.env.SMOKE_CONTROL_PATH ?? "/";
const READY_TIMEOUT_MS = Number(process.env.SMOKE_READY_TIMEOUT_MS ?? 90_000);

// Text that only the harness page renders. If one shows up, the fixture leaked.
const HARNESS_MARKERS = ["Harness sheet", "Gesture test fixture", "Open sheet"];

// The gate: these MUST be exactly 404.
const MUST_BE_404 = [
  "/dev/sheet-harness",
  "/dev/sheet-harness/",
  "/dev/sheet-harness?x=1",
  "/dev/",
  "/dev/anything-else",
];

// Bypass attempts and near-misses: these must never serve the harness (never 200).
// A redirect to login or a 404 are both acceptable here.
const MUST_NOT_SERVE = [
  "/dev",
  "/DEV/sheet-harness",
  "/%64ev/sheet-harness", // percent-encoded "d"
  "//dev/sheet-harness",
  "/dev/%2e/sheet-harness",
  "/%2564ev/sheet-harness", // double percent-encoded "d"
  "/dev%2fsheet-harness", // encoded slash
  "/dev%5csheet-harness", // encoded backslash
];

const logs = [];
let child = null;
let childExit = null;

function die(message, code = 1) {
  console.error(`\n✖ ${message}`);
  if (logs.length) {
    console.error("\n--- last server output ---");
    console.error(logs.slice(-40).join(""));
  }
  cleanup();
  process.exit(code);
}

function cleanup() {
  if (child && childExit === null) {
    try {
      child.kill();
    } catch {
      /* already gone */
    }
  }
}
process.on("SIGINT", () => {
  cleanup();
  process.exit(130);
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function probe(p) {
  const res = await fetch(BASE + p, {
    redirect: "manual", // a redirect must be visible, not followed
    headers: { "user-agent": "smoke-prod-404" },
  });
  const body = res.status === 200 ? await res.text() : "";
  return { status: res.status, body, location: res.headers.get("location") };
}

async function probeFollowRedirects(initialPath, maxHops = 5) {
  let currentPath = initialPath;
  let hops = 0;
  const redirectNotes = [];
  while (hops < maxHops) {
    const res = await probe(currentPath);
    if (
      (res.status === 301 || res.status === 302 || res.status === 307 || res.status === 308) &&
      res.location
    ) {
      try {
        const nextUrl = new URL(res.location, BASE);
        // Same-origin check
        if (nextUrl.origin === new URL(BASE).origin) {
          redirectNotes.push(`${res.status} → ${nextUrl.pathname}${nextUrl.search}`);
          // If redirected to login, stop: authentication safely intercepted the bypass attempt
          if (nextUrl.pathname.startsWith("/auth/") || nextUrl.pathname.startsWith("/login")) {
            return {
              status: res.status,
              body: "",
              location: res.location,
              redirectNotes,
              terminalStatus: res.status,
            };
          }
          currentPath = nextUrl.pathname + nextUrl.search;
          hops++;
          continue;
        }
      } catch {}
      redirectNotes.push(`${res.status} → ${res.location}`);
      return { ...res, redirectNotes, terminalStatus: res.status };
    }
    return { ...res, redirectNotes, terminalStatus: res.status };
  }
  return { status: 508, body: "", location: null, redirectNotes, terminalStatus: 508 };
}

/* ---------- 1. Refuse to run in a polluted environment ---------- */
const leaked = ["NEXT_PUBLIC_E2E", "PLAYWRIGHT_TEST"].filter((k) => process.env[k]);
if (leaked.length) {
  die(
    `${leaked.join(", ")} is set. This gate must run in a clean production ` +
      `environment, otherwise it proves nothing. Unset it and rebuild.`
  );
}

/* ---------- 2. Start the production server (unless testing a URL) ---------- */
if (!EXTERNAL) {
  if (!existsSync(SERVER_JS)) {
    die(
      `${SERVER_JS} not found. Run a normal "pnpm build" first ` +
        `(not build:e2e), or set SMOKE_SERVER / SMOKE_BASE_URL.`
    );
  }
  const defaultSmokeEnv = {
    DATABASE_URL: process.env.DATABASE_URL || `file:${path.resolve("dev.db").replace(/\\/g, "/")}`,
    AUTH_JWT_SECRET: process.env.AUTH_JWT_SECRET || "smoke-prod-gate-auth-jwt-secret-32-chars",
    CRON_SECRET: process.env.CRON_SECRET || "smoke-prod-gate-cron-secret-32-chars",
    METRICS_SECRET: process.env.METRICS_SECRET || "smoke-prod-gate-metrics-secret-32",
    PII_ENCRYPTION_KEY: process.env.PII_ENCRYPTION_KEY || "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    RECEIPT_SIGNING_KEY: process.env.RECEIPT_SIGNING_KEY || "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    MDM_ENROLLMENT_TOKEN: process.env.MDM_ENROLLMENT_TOKEN || "smoke-prod-gate-mdm-token-32-chars",
    PAYMENT_ENCRYPTION_KEY: process.env.PAYMENT_ENCRYPTION_KEY || "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    HEALTH_SECRET: process.env.HEALTH_SECRET || "smoke-prod-gate-health-secret-32",
    SYSTEM_UPDATE_SECRET: process.env.SYSTEM_UPDATE_SECRET || "smoke-prod-gate-sys-secret-32",
    JWT_SECRET: process.env.JWT_SECRET || process.env.AUTH_JWT_SECRET || "smoke-prod-gate-jwt-secret-32-chars",
    BIOMETRIC_MASTER_KEY: process.env.BIOMETRIC_MASTER_KEY || "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    TENANT_ENCRYPTION_MASTER_KEY: process.env.TENANT_ENCRYPTION_MASTER_KEY || "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  };
  child = spawn(process.execPath, [SERVER_JS], {
    env: {
      ...defaultSmokeEnv,
      ...process.env,
      NODE_ENV: "production",
      PORT,
      HOSTNAME: "127.0.0.1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (d) => logs.push(String(d)));
  child.stderr.on("data", (d) => logs.push(String(d)));
  child.on("exit", (code) => {
    childExit = code ?? -1;
  });
}

/* ---------- 3. Wait until the server answers ---------- */
{
  const start = Date.now();
  let ready = false;
  while (Date.now() - start < READY_TIMEOUT_MS) {
    if (childExit !== null) die(`Server exited early with code ${childExit}.`);
    try {
      await probe(CONTROL_PATH); // any HTTP response means it is up
      ready = true;
      break;
    } catch {
      await sleep(500);
    }
  }
  if (!ready) die(`Server did not become ready within ${READY_TIMEOUT_MS} ms.`);
}

/* ---------- 4. Run the checks ---------- */
const failures = [];
const rows = [];

function record(kind, p, status, ok, note = "") {
  rows.push({ kind, p, status, ok, note });
  if (!ok) failures.push(`${kind} ${p} → ${status}${note ? ` (${note})` : ""}`);
}

// Control: guards against a false pass where the server 404s everything
// (wrong basePath, broken boot, wrong server.js).
{
  const r = await probe(CONTROL_PATH);
  record(
    "control",
    CONTROL_PATH,
    r.status,
    r.status !== 404 && r.status < 500,
    r.status === 404 ? "control route 404s: server is not serving the app" : ""
  );
}

for (const p of MUST_BE_404) {
  const r = await probeFollowRedirects(p);
  const note = r.redirectNotes.length ? `(${r.redirectNotes.join(", ")})` : "";
  const leakedHarness = HARNESS_MARKERS.some((m) => r.body.includes(m));
  record(
    "must-404",
    p,
    r.terminalStatus,
    r.terminalStatus === 404 && !leakedHarness,
    leakedHarness ? `harness markup present ${note}`.trim() : note
  );
}

for (const p of MUST_NOT_SERVE) {
  const r = await probeFollowRedirects(p);
  const note = r.redirectNotes.length ? `(${r.redirectNotes.join(", ")})` : "";
  const leakedHarness = HARNESS_MARKERS.some((m) => r.body.includes(m));
  record(
    "no-serve",
    p,
    r.terminalStatus,
    r.terminalStatus !== 200 && !leakedHarness,
    leakedHarness
      ? `harness markup present ${note}`.trim()
      : r.terminalStatus === 200
        ? `served with 200 ${note}`.trim()
        : note
  );
}

/* ---------- 5. Report ---------- */
console.log(`\nProduction fixture gate against ${BASE}\n`);
for (const r of rows) {
  console.log(
    `${r.ok ? "✔" : "✖"} ${r.kind.padEnd(8)} ${r.p.padEnd(32)} ${String(r.status).padEnd(4)} ${r.note}`
  );
}

cleanup();

if (failures.length) {
  console.error(`\n✖ GATE FAILED (${failures.length}):`);
  failures.forEach((f) => console.error(`  - ${f}`));
  console.error(
    "\nIf you changed the fixture page text, update HARNESS_MARKERS in this script."
  );
  process.exit(1);
}
console.log("\n✔ Gate passed: fixtures are not reachable in this build.");
