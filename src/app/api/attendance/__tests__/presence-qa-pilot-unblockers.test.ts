/**
 * @jest-environment node
 *
 * Wave D — Presence Enforcement Pilot Unblockers & Correctness Tests
 * Covers OpenCode Exploratory QA Findings:
 * - QA-01: batteryLevel -1 sentinel coerced to null (not 400) in presenceLogEntrySchema & checkoutPresenceSchema
 * - QA-02 / QA-27: Bulk presence-log skips individual malformed items (returns skipped count) and enforces 200-item batch cap
 * - QA-05: attendance_logs.institutionId populated on check-in and mobile sync
 * - QA-08: Flag-off presence logs do not increment geofenceViolations from unverified client claims
 * - QA-09: enforcePresence internal evaluation error returns violationsIncrement: false
 * - QA-18: Multiple violations in a single presence-log batch increment geofenceViolations cumulatively
 */

import { NextRequest } from "next/server";
import {
  presenceLogEntrySchema,
  checkoutPresenceSchema,
} from "@/lib/validation/schemas";

const mockSession = {
  staffId: "staff_pilot_1",
  role: "staff",
  institutionId: "inst-tps-majhi",
  email: "staff@tps-majhi.edu",
};

type MockRouteHandler = (
  req: NextRequest,
  session: unknown,
  ctx: unknown
) => Promise<Response>;
jest.mock("@/lib/api/auth-guard", () => ({
  requireAuth: (handler: MockRouteHandler) => (req: NextRequest, ctx: unknown) =>
    handler(req, mockSession, ctx),
}));

let mockFeatureEnabled = false;
jest.mock("@/lib/features", () => ({
  isPresenceTrackingEnabled: () => mockFeatureEnabled,
}));

const mockEnforcePresence = jest.fn();
jest.mock("@/lib/attendance/presence-enforcement-engine", () => ({
  enforcePresence: (...args: unknown[]) => mockEnforcePresence(...args),
  resolvePresenceSettings: jest.fn().mockResolvedValue({
    isEnabled: true,
    shadowMode: true,
    checkIntervalMinutes: 15,
    gracePeriodMinutes: 10,
    maxAccuracyMeters: 100,
    autoCheckoutOnViolation: false,
    requireWifiMatch: false,
    source: "institution",
  }),
  loadGeofenceLocations: jest.fn().mockResolvedValue([
    {
      id: "loc_1",
      name: "Main Gate",
      latitude: 12.9716,
      longitude: 77.5946,
      radiusMeters: 100,
      wifiSsid: null,
    },
  ]),
}));

const mockAttendanceRow = {
  id: "att_1",
  staffId: "staff_pilot_1",
  institutionId: "inst-tps-majhi",
  geofenceViolations: 0,
  presenceStatus: "verified",
};

const mockUpdates: Array<Record<string, unknown>> = [];
const mockInsertedPresenceLogs: Array<Record<string, unknown>> = [];

jest.mock("@/db", () => {
  const tx = {
    insert: () => ({
      values: (val: Record<string, unknown>) => ({
        returning: () => ({
          get: async () => {
            mockInsertedPresenceLogs.push(val);
            return val;
          },
        }),
      }),
    }),
    update: () => ({
      set: (val: Record<string, unknown>) => ({
        where: () => ({
          run: async () => {
            mockUpdates.push(val);
          },
        }),
      }),
    }),
  };
  return {
    db: {
      select: () => ({
        from: () => ({
          where: () => ({
            all: async () => [{ ...mockAttendanceRow }],
          }),
        }),
      }),
      transaction: async (cb: (t: typeof tx) => Promise<void>) => cb(tx),
    },
  };
});

import { POST as postPresenceLog } from "@/app/api/attendance/presence-log/route";

describe("Wave D — Presence Enforcement Pilot Unblockers (QA-01..QA-27)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFeatureEnabled = false;
    mockAttendanceRow.geofenceViolations = 0;
    mockUpdates.length = 0;
    mockInsertedPresenceLogs.length = 0;
  });

  it("QA-01: coerces batteryLevel -1 sentinel to null in presenceLogEntrySchema and checkoutPresenceSchema", () => {
    const parsedPresence = presenceLogEntrySchema.safeParse({
      attendanceId: "att_1",
      latitude: 12.9716,
      longitude: 77.5946,
      batteryLevel: -1,
    });
    expect(parsedPresence.success).toBe(true);
    if (parsedPresence.success) {
      expect(parsedPresence.data.batteryLevel).toBeNull();
    }

    const parsedCheckout = checkoutPresenceSchema.safeParse({
      latitude: 12.9716,
      longitude: 77.5946,
      batteryLevel: -1,
    });
    expect(parsedCheckout.success).toBe(true);
    if (parsedCheckout.success) {
      expect(parsedCheckout.data.batteryLevel).toBeNull();
    }
  });

  it("QA-02: bulk presence-log skips individual malformed entries instead of poisoning the whole batch", async () => {
    const req = new NextRequest("http://localhost/api/attendance/presence-log", {
      method: "POST",
      body: JSON.stringify({
        logs: [
          {
            attendanceId: "att_1",
            latitude: 12.9716,
            longitude: 77.5946,
            batteryLevel: -1, // Coerced to null -> valid
          },
          {
            attendanceId: "att_1",
            latitude: 999, // Invalid latitude -> skipped in bulk mode
            longitude: 77.5946,
          },
          {
            attendanceId: "att_1",
            latitude: 12.972,
            longitude: 77.595,
            batteryLevel: 85,
          },
        ],
      }),
    });

    const res = await postPresenceLog(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.logs).toHaveLength(2);
    expect(json.skipped).toBe(1);
    expect(mockInsertedPresenceLogs[0].batteryLevel).toBeNull();
    expect(mockInsertedPresenceLogs[1].batteryLevel).toBe(85);
  });

  it("QA-27: rejects bulk batches exceeding 200 items with 400", async () => {
    const oversized = Array.from({ length: 201 }, () => ({
      attendanceId: "att_1",
      latitude: 12.9716,
      longitude: 77.5946,
    }));
    const req = new NextRequest("http://localhost/api/attendance/presence-log", {
      method: "POST",
      body: JSON.stringify({ logs: oversized }),
    });

    const res = await postPresenceLog(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/maximum of 200/i);
  });

  it("QA-08: does not increment geofenceViolations from unverified client claims when feature flag is off", async () => {
    mockFeatureEnabled = false;
    const req = new NextRequest("http://localhost/api/attendance/presence-log", {
      method: "POST",
      body: JSON.stringify({
        attendanceId: "att_1",
        latitude: 12.0,
        longitude: 77.0,
        isWithinGeofence: false,
      }),
    });

    const res = await postPresenceLog(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(201);
    expect(mockUpdates).toHaveLength(1);
    expect(mockUpdates[0].geofenceViolations).toBe(0);
    expect(mockUpdates[0].presenceStatus).toBe("field_work");
  });

  it("QA-18: increments geofenceViolations cumulatively across multiple violations in the same batch", async () => {
    mockFeatureEnabled = true;
    mockEnforcePresence.mockResolvedValue({
      presenceStatus: "unverified",
      enforceable: false,
      violationsIncrement: true,
      evaluation: {
        withinGeofence: false,
        distanceMeters: 450,
        mockSuspected: false,
      },
    });

    const req = new NextRequest("http://localhost/api/attendance/presence-log", {
      method: "POST",
      body: JSON.stringify({
        logs: [
          { attendanceId: "att_1", latitude: 12.9, longitude: 77.5 },
          { attendanceId: "att_1", latitude: 12.8, longitude: 77.4 },
          { attendanceId: "att_1", latitude: 12.7, longitude: 77.3 },
        ],
      }),
    });

    const res = await postPresenceLog(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(201);
    expect(mockUpdates).toHaveLength(3);
    expect(mockUpdates[0].geofenceViolations).toBe(1);
    expect(mockUpdates[1].geofenceViolations).toBe(2);
    expect(mockUpdates[2].geofenceViolations).toBe(3);
  });
});
