/**
 * O1 — Authorization matrix test (audit report).
 *
 * For every API route handler discovered by the AST manifest
 * (src/lib/test-helpers/route-matrix.ts):
 *   1. 401 — no session (requireAuth + self-verified handlers)
 *   2. 403 — authenticated role that lacks the route permission
 *   3. public routes — positive test: reachable without a session
 *
 * Uses the REAL hasPermission / role matrix; only verifySession is mocked.
 */
jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: jest.fn(),
  };
});

// uuid@14 is ESM-only and pnpm's nested node_modules defeats the
// transformIgnorePatterns allow-list — stub it for module-load parity.
jest.mock("uuid", () => ({
  __esModule: true,
  v4: () => "00000000-0000-4000-8000-000000000000",
}));

import fs from "fs";
import { hasPermission } from "@thaiba/auth";
import { VALID_STAFF_ROLES } from "@thaiba/auth/roles";
import {
  buildManifest,
  entryKey,
  loadRouteModule,
  type RouteHandlerEntry,
} from "@/lib/test-helpers/route-matrix";

const { verifySession } = jest.requireMock("@thaiba/auth") as {
  verifySession: jest.Mock;
};

jest.setTimeout(60000);

const manifest = buildManifest();
const requireAuthEntries = manifest.filter((e) => e.guard === "requireAuth");
const selfEntries = manifest.filter((e) => e.guard === "self");
const publicEntries = manifest.filter((e) => e.guard === "public");

/**
 * Explicit skip lists with reasons (audit requirement).
 * Keys are `${file}#${method}`.
 */
const SKIP_401 = new Map<string, string>([
  [
    "src/app/api/openapi.json/route.ts#GET",
    "session check is production-only by design; serves the spec in test/dev",
  ],
]);

const SKIP_403 = new Map<string, string>([
  [
    "src/app/api/auth/revoke/route.ts#POST",
    "withDPoP({required:true}) gate rejects with 401 before RBAC runs",
  ],
]);

/**
 * "Public" by wrapper shape but self-authenticating via a custom identity
 * check (step-up cookie, metrics secret, ...). They must deny anonymous
 * callers with 401 — asserted explicitly instead of the reachability rule.
 */
const CUSTOM_AUTH_PUBLIC = new Map<string, string>([
  ["src/app/api/auth/stepup/otp/route.ts#POST", "resolveStepUpIdentity"],
  ["src/app/api/auth/webauthn/challenge/route.ts#POST", "resolveStepUpIdentity"],
  ["src/app/api/auth/webauthn/verify/route.ts#POST", "resolveStepUpIdentity"],
  ["src/app/api/metrics/route.ts#GET", "x-metrics-secret or admin session"],
]);

const SKIP_PUBLIC = new Map<string, string>([
  [
    "src/app/api/auth/oidc/login/route.ts#GET",
    "NextResponse.cookies.set needs the full Response headers API (jsdom MockResponse gap); route is redirect-only",
  ],
]);

/**
 * Self-verified handlers that read/parse the body before the session check.
 * They need a JSON body to reach the 401 branch.
 */
const SELF_401_BODY = new Map<string, Record<string, unknown>>([
  ["src/app/api/media/batch-download/route.ts#POST", { probe: true }],
]);

function skip401Reason(e: RouteHandlerEntry): string | null {
  return SKIP_401.get(entryKey(e)) ?? null;
}

function skip403Reason(e: RouteHandlerEntry): string | null {
  const explicit = SKIP_403.get(entryKey(e));
  if (explicit) return explicit;
  if (e.guard !== "requireAuth") return "not a requireAuth route (covered by 401 test)";
  if (!e.permission) {
    return "naked requireAuth: no permission argument (inline requireAuth form; flagged by security:requireauth gap)";
  }
  if (e.dpopRequired) {
    return "DPoP proof gate returns 401 before RBAC";
  }
  return null;
}

function firstRoleWithoutPermission(perm: string): string | null {
  for (const role of VALID_STAFF_ROLES) {
    if (role === "super_admin" || role === "system") continue;
    if (!hasPermission(role, perm as Parameters<typeof hasPermission>[1])) return role;
  }
  return null;
}

function sessionFor(role: string) {
  return {
    staffId: `staff-${role}`,
    email: `${role}@matrix.test`,
    role,
    employeeId: `EMP-MATRIX-${role}`,
    name: "Matrix Probe",
    tokenVersion: 1,
    institutionId: "inst-matrix",
  };
}

function contextFor(e: RouteHandlerEntry) {
  const params: Record<string, string> = {};
  for (const seg of e.routePath.split("/")) {
    const m = seg.match(/^\[(.+)\]$/);
    if (m) params[m[1]] = "probe-id";
  }
  return { params: Promise.resolve(params) };
}

function jsonInit(body: Record<string, unknown>): RequestInit {
  return {
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}

async function invoke(
  e: RouteHandlerEntry,
  init?: RequestInit
): Promise<Response> {
  const mod = await loadRouteModule(e);
  const handler = mod[e.method];
  if (typeof handler !== "function") {
    throw new Error(
      `Handler ${e.method} not exported by ${e.moduleName} (found: ${Object.keys(mod).join(", ")})`
    );
  }
  const req = new Request(`http://localhost${e.routePath}`, {
    method: e.method,
    ...init,
  });
  return (handler as (r: Request, c?: unknown) => Promise<Response>)(
    req,
    contextFor(e)
  );
}

function bodyInitFor(e: RouteHandlerEntry): RequestInit | undefined {
  if (e.method === "POST" || e.method === "PUT" || e.method === "PATCH") {
    return jsonInit({ probe: true });
  }
  return undefined;
}

beforeAll(() => {
  process.env.APM_TELEMETRY_ENABLED = "false";
  jest.spyOn(console, "warn").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterAll(() => {
  jest.restoreAllMocks();
  const skipped401 = manifest.filter((e) => skip401Reason(e)).length;
  const skipped403 = manifest.filter((e) => skip403Reason(e)).length;
  // Coverage report: every handler in the manifest is exercised or explicitly skipped.
  console.log(
    JSON.stringify(
      {
        manifestHandlers: manifest.length,
        requireAuth: requireAuthEntries.length,
        selfGuarded: selfEntries.length,
        public: publicEntries.length,
        tested401: manifest.length - skipped401,
        skipped401,
        tested403: requireAuthEntries.filter((e) => !skip403Reason(e)).length,
        skipped403,
        customAuthPublic: CUSTOM_AUTH_PUBLIC.size,
        skippedPublic: SKIP_PUBLIC.size,
      },
      null,
      2
    )
  );
});

describe("route manifest integrity", () => {
  it("contains no duplicate file#method handlers", () => {
    const seen = new Set<string>();
    const dups: string[] = [];
    for (const e of manifest) {
      const k = entryKey(e);
      if (seen.has(k)) dups.push(k);
      seen.add(k);
    }
    expect(dups).toEqual([]);
  });

  it("discovers the full route surface (sanity floor of 600 handlers)", () => {
    expect(manifest.length).toBeGreaterThanOrEqual(600);
  });

  it("documents every 401/403/public skip with a reason", () => {
    for (const [, reason] of SKIP_401) expect(reason.length).toBeGreaterThan(10);
    for (const [, reason] of SKIP_403) expect(reason.length).toBeGreaterThan(10);
    for (const [, reason] of SKIP_PUBLIC) expect(reason.length).toBeGreaterThan(10);
    for (const [, reason] of CUSTOM_AUTH_PUBLIC) expect(reason.length).toBeGreaterThan(3);
    expect(SKIP_401.size).toBeGreaterThan(0);
    expect(SKIP_403.size).toBeGreaterThan(0);
  });
});

describe("401 — no session is rejected", () => {
  for (const e of requireAuthEntries) {
    const reason = skip401Reason(e);
    if (reason) {
      it.skip(`${e.method} ${e.routePath} → 401 (${reason})`, () => {});
      continue;
    }
    it(`${e.method} ${e.routePath} → 401 Not authenticated`, async () => {
      verifySession.mockResolvedValue(null);
      const res = await invoke(e);
      expect(res.status).toBe(401);
      if (!e.dpopRequired) {
        expect(await res.json()).toEqual({ error: "Not authenticated" });
      }
    });
  }

  for (const e of selfEntries) {
    const reason = skip401Reason(e);
    if (reason) {
      it.skip(`${e.method} ${e.routePath} → 401 (${reason})`, () => {});
      continue;
    }
    it(`${e.method} ${e.routePath} → 401 (self-verified)`, async () => {
      verifySession.mockResolvedValue(null);
      const override = SELF_401_BODY.get(entryKey(e));
      const res = await invoke(e, override ? jsonInit(override) : undefined);
      expect(res.status).toBe(401);
    });
  }
});

describe("403 — authenticated role without the required permission", () => {
  for (const e of requireAuthEntries) {
    const reason = skip403Reason(e);
    if (reason) {
      it.skip(`${e.method} ${e.routePath} → 403 (${reason})`, () => {});
      continue;
    }
    const role = firstRoleWithoutPermission(e.permission as string);
    if (!role) {
      it.skip(
        `${e.method} ${e.routePath} → 403 (permission ${e.permission} is granted to every valid role)`,
        () => {}
      );
      continue;
    }
    it(`${e.method} ${e.routePath} → 403 for role "${role}" lacking ${e.permission}`, async () => {
      verifySession.mockResolvedValue(sessionFor(role));
      const res = await invoke(e);
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ error: "Forbidden" });
    });
  }
});

describe("public routes — positive (not blocked by the session guard)", () => {
  for (const e of publicEntries) {
    const key = entryKey(e);
    const customAuth = CUSTOM_AUTH_PUBLIC.get(key);
    const skipReason = SKIP_PUBLIC.get(key);
    if (skipReason) {
      it.skip(`${e.method} ${e.routePath} reachable without a session (${skipReason})`, () => {});
      continue;
    }
    if (customAuth) {
      it(`${e.method} ${e.routePath} denies anonymous via ${customAuth}`, async () => {
        verifySession.mockResolvedValue(null);
        const res = await invoke(e, bodyInitFor(e));
        expect(res.status).toBe(401);
        expect(await res.json()).toEqual({ error: "Not authenticated" });
      });
      continue;
    }
    it(`${e.method} ${e.routePath} reachable without a session`, async () => {
      verifySession.mockResolvedValue(null);
      const res = await invoke(e, bodyInitFor(e));
      expect(res.status).toBeLessThan(600);
      if (res.status === 401) {
        const body = await res.json().catch(() => null);
        expect(body?.error).not.toBe("Not authenticated");
      }
    });
  }
});

describe("middleware public paths (B4 webhook bypass)", () => {
  const middlewarePath = fs.existsSync("src/proxy.ts")
    ? "src/proxy.ts"
    : "src/middleware.ts";
  const src = fs.readFileSync(middlewarePath, "utf-8");
  const exactMatch = src.match(/exactPublicPaths\s*=\s*new\s+Set\(\[([\s\S]*?)\]\)/);
  const prefixMatch = src.match(/prefixPublicPaths\s*=\s*\[([\s\S]*?)\]/);
  const legacyMatch = src.match(/const\s+publicPaths\s*=\s*\[([\s\S]*?)\]/);
  
  const extractedSections = [
    exactMatch ? exactMatch[1] : "",
    prefixMatch ? prefixMatch[1] : "",
    legacyMatch ? legacyMatch[1] : "",
  ].join("\n");

  const paths = [...extractedSections.matchAll(/"([^"]+)"/g)].map((m) => m[1]);

  it.each([
    "/api/finance/fees/webhooks",
    "/api/webhooks/edge-security",
    "/api/engage/voice",
  ])("%s is allow-listed in middleware publicPaths", (p) => {
    expect(paths).toContain(p);
  });
});
