/**
 * Tests for the presence staleness sweep cron (Wave 4).
 * Mocks db, auth, shifts, features, and settings resolution.
 */

jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: jest.fn().mockResolvedValue({
      staffId: "system",
      role: "system",
      email: "system@internal",
      employeeId: "system",
      name: "System",
      tokenVersion: 1,
      institutionId: "global",
    }),
    hasPermission: jest.fn(() => true),
    resolveInstitutionScopeForSession: jest.fn().mockResolvedValue("global"),
  };
});

jest.mock("@/lib/features", () => ({
  isPresenceTrackingEnabled: jest.fn(() => true),
}));

jest.mock("@/lib/attendance/shifts", () => ({
  resolveShift: jest.fn(async () => ({
    id: "shift-1",
    name: "Default",
    startTime: "09:00",
    endTime: "17:00",
    isActive: true,
  })),
}));

jest.mock("@/lib/attendance/presence-enforcement-engine", () => ({
  resolvePresenceSettings: jest.fn(async () => ({
    isEnabled: true,
    shadowMode: true,
    checkIntervalMinutes: 10,
    gracePeriodMinutes: 5,
    autoCheckoutOnViolation: false,
    geofenceRadiusMeters: 150,
    lowBatteryIntervalMinutes: 15,
    criticalBatterySuspend: true,
    source: "institution",
  })),
}));

jest.mock("@/db", () => {
  const state: {
    candidates: unknown[];
    updatedRows: { values: Record<string, unknown>; id: string | null }[];
    transactions: number;
  } = { candidates: [], updatedRows: [], transactions: 0 };

  const tx = {
    update: jest.fn(() => ({
      set: jest.fn((values: Record<string, unknown>) => ({
        where: jest.fn((cond: unknown) => ({
          run: jest.fn(() => {
            state.updatedRows.push({ values, id: null });
            return { changes: 1 };
          }),
        })),
        values,
      })),
    })),
  };

  return {
    db: {
      select: jest.fn(() => ({
        from: jest.fn(() => ({
          where: jest.fn(() => ({
            all: () => Promise.resolve(state.candidates),
          })),
        })),
      })),
      transaction: jest.fn(async (cb: (tx: unknown) => Promise<unknown>) => {
        state.transactions += 1;
        return cb(tx);
      }),
    },
    __setCandidates(rows: unknown[]) {
      state.candidates = rows;
    },
    __getUpdates() {
      return state.updatedRows;
    },
    __getTransactions() {
      return state.transactions;
    },
    __reset() {
      state.candidates = [];
      state.updatedRows = [];
      state.transactions = 0;
    },
  };
});

const { GET } = require("@/app/api/cron/presence-sweep/route");
const { __setCandidates, __getUpdates, __getTransactions, __reset } =
  jest.requireMock("@/db");
const { isPresenceTrackingEnabled } = jest.requireMock("@/lib/features");
const { resolvePresenceSettings } = jest.requireMock(
  "@/lib/attendance/presence-enforcement-engine"
);

function isoHoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 3_600_000).toISOString();
}

function makeCandidate(overrides: Record<string, unknown> = {}) {
  const today = new Date().toISOString().split("T")[0];
  return {
    id: "att-1",
    staffId: "staff-1",
    institutionId: "inst_alpha",
    date: today,
    checkIn: isoHoursAgo(6),
    lastVerifiedAt: isoHoursAgo(3), // far beyond 10+5 min window => stale
    geofenceViolations: 0,
    ...overrides,
  };
}

async function runGet(query = "") {
  const res = await GET(
    new Request(`http://localhost/api/cron/presence-sweep${query}`)
  );
  return { res, json: await res.json() };
}

beforeEach(() => {
  __reset();
  (isPresenceTrackingEnabled as jest.Mock).mockImplementation(() => true);
  (resolvePresenceSettings as jest.Mock).mockImplementation(async () => ({
    isEnabled: true,
    shadowMode: true,
    checkIntervalMinutes: 10,
    gracePeriodMinutes: 5,
    autoCheckoutOnViolation: false,
    geofenceRadiusMeters: 150,
    lowBatteryIntervalMinutes: 15,
    criticalBatterySuspend: true,
    source: "institution",
  }));
});

describe("GET /api/cron/presence-sweep", () => {
  it("skips every session when the institution's feature flag is off", async () => {
    (isPresenceTrackingEnabled as jest.Mock).mockImplementation(() => false);
    __setCandidates([makeCandidate(), makeCandidate({ id: "att-2" })]);

    const { json } = await runGet();

    expect(json.scanned).toBe(2);
    expect(json.staleSessions).toBe(0);
    expect(json.skippedDisabledOrFlagOff).toBe(2);
    expect(__getTransactions()).toBe(0);
    expect(__getUpdates()).toHaveLength(0);
  });

  it("skips sessions whose presence verification is disabled", async () => {
    (resolvePresenceSettings as jest.Mock).mockImplementation(async () => ({
      isEnabled: false,
      shadowMode: true,
      checkIntervalMinutes: 10,
      gracePeriodMinutes: 5,
      autoCheckoutOnViolation: false,
      geofenceRadiusMeters: 150,
      lowBatteryIntervalMinutes: 15,
      criticalBatterySuspend: true,
      source: "institution",
    }));
    __setCandidates([makeCandidate()]);

    const { json } = await runGet();

    expect(json.skippedDisabledOrFlagOff).toBe(1);
    expect(json.staleSessions).toBe(0);
    expect(__getUpdates()).toHaveLength(0);
  });

  it("treats fresh sessions as not stale", async () => {
    __setCandidates([makeCandidate({ lastVerifiedAt: new Date().toISOString() })]);

    const { json } = await runGet();

    expect(json.staleSessions).toBe(0);
    expect(__getUpdates()).toHaveLength(0);
  });

  it("shadow mode: increments violations but never auto-checks-out", async () => {
    __setCandidates([makeCandidate()]);

    const { json } = await runGet();

    expect(json.staleSessions).toBe(1);
    expect(json.autoCheckouts).toBe(0);
    expect(json.shadowOnlyViolations).toBe(1);

    const updates = __getUpdates();
    expect(updates).toHaveLength(1);
    expect(updates[0].values.geofenceViolations).toBe(1);
    expect(updates[0].values.checkOut).toBeUndefined();
    expect(updates[0].values.source).toBeUndefined();
  });

  it("auto-checks-out when enabled and not in shadow mode, stamped source auto", async () => {
    (resolvePresenceSettings as jest.Mock).mockImplementation(async () => ({
      isEnabled: true,
      shadowMode: false,
      checkIntervalMinutes: 10,
      gracePeriodMinutes: 5,
      autoCheckoutOnViolation: true,
      geofenceRadiusMeters: 150,
      lowBatteryIntervalMinutes: 15,
      criticalBatterySuspend: true,
      source: "institution",
    }));
    __setCandidates([makeCandidate()]);

    const { json } = await runGet();

    expect(json.autoCheckouts).toBe(1);
    const updates = __getUpdates();
    expect(updates).toHaveLength(1);
    const checkout = updates.find(
      (u: { values: Record<string, unknown> }) => u.values.checkOut !== undefined
    );
    expect(checkout).toBeDefined();
    expect(checkout!.values.source).toBe("auto");
    expect(checkout!.values.presenceStatus).toBe("unverified");
    expect(checkout!.values.geofenceViolations).toBe(1);
    expect(checkout!.values.workedMinutes).toBeGreaterThanOrEqual(0);
  });

  it("caps auto checkout at the session date's shift end for stale yesterday sessions", async () => {
    (resolvePresenceSettings as jest.Mock).mockImplementation(async () => ({
      isEnabled: true,
      shadowMode: false,
      checkIntervalMinutes: 10,
      gracePeriodMinutes: 5,
      autoCheckoutOnViolation: true,
      geofenceRadiusMeters: 150,
      lowBatteryIntervalMinutes: 15,
      criticalBatterySuspend: true,
      source: "institution",
    }));

    const yesterday = new Date(Date.now() - 86_400_000)
      .toISOString()
      .split("T")[0];
    const checkIn = `${yesterday}T09:00:00.000`;
    __setCandidates([
      makeCandidate({
        date: yesterday,
        checkIn,
        lastVerifiedAt: `${yesterday}T09:30:00.000`,
      }),
    ]);

    const { json } = await runGet();

    expect(json.autoCheckouts).toBe(1);
    const checkout = __getUpdates().find(
      (u: { values: Record<string, unknown> }) => u.values.checkOut !== undefined
    );
    // min(now, shiftEnd=yesterday 17:00, yesterday 23:59) => yesterday 17:00
    expect(checkout!.values.checkOut).toBe(
      new Date(`${yesterday}T17:00:00.000`).toISOString()
    );
    expect(checkout!.values.workedMinutes).toBe(480);
    expect(checkout!.values.earlyExitMinutes).toBe(0);
  });

  it("dryRun performs no writes", async () => {
    (resolvePresenceSettings as jest.Mock).mockImplementation(async () => ({
      isEnabled: true,
      shadowMode: false,
      checkIntervalMinutes: 10,
      gracePeriodMinutes: 5,
      autoCheckoutOnViolation: true,
      geofenceRadiusMeters: 150,
      lowBatteryIntervalMinutes: 15,
      criticalBatterySuspend: true,
      source: "institution",
    }));
    __setCandidates([makeCandidate()]);

    const { json } = await runGet("?dryRun=1");

    expect(json.dryRun).toBe(true);
    expect(json.staleSessions).toBe(1);
    expect(json.autoCheckouts).toBe(1);
    expect(__getTransactions()).toBe(0);
    expect(__getUpdates()).toHaveLength(0);
  });

  it("sessions without lastVerifiedAt fall back to check-in as staleness baseline", async () => {
    __setCandidates([makeCandidate({ lastVerifiedAt: null })]);

    const { json } = await runGet();

    expect(json.staleSessions).toBe(1);
  });
});
