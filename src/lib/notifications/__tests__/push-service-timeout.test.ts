/**
 * Item 2 — FCM downstream timeouts & tenant-scoped stale token pruning.
 *
 * Covers the three guarantees added to `sendBulkPushNotifications`:
 *   1. a 12s hard timeout per multicast wave,
 *   2. a 45s total deadline that breaks the wave loop and returns partial
 *      progress before Vercel's execution ceiling,
 *   3. stale-token pruning scoped by `institutionId`.
 */

import { db } from "@/db";
import { notifications, staff, staffDeviceTokens } from "@/db/schema";
import { FCM_TOTAL_DEADLINE_MS, sendBulkPushNotifications } from "@/lib/notifications/push-service";
import { eq, sql } from "drizzle-orm";

const mockSendEachForMulticast = jest.fn();

jest.mock("firebase-admin/app", () => ({
  initializeApp: jest.fn(),
  getApps: jest.fn(() => [{ name: "mock-app" }]),
  cert: jest.fn(() => ({})),
}));

jest.mock("firebase-admin/messaging", () => ({
  getMessaging: jest.fn(() => ({
    sendEachForMulticast: (payload: unknown) => mockSendEachForMulticast(payload),
  })),
}));

jest.mock("@/lib/api/realtime", () => {
  const actual = jest.requireActual("@/lib/api/realtime");
  return { ...actual, sendToConnection: jest.fn() };
});

const INSTITUTION_A = "inst-item2-a";
const INSTITUTION_B = "inst-item2-b";
const STAFF_ONE = "staff-item2-1";
const STAFF_TWO = "staff-item2-2";

const TEST_TITLE = "Item2 Push Timeout";
const TEST_MESSAGE = "item2 push timeout payload";

async function seedTokens(prefix: string, count: number, institutionId: string, staffId: string) {
  const now = new Date().toISOString();
  const rows = Array.from({ length: count }, (_, i) => ({
    id: `${prefix}-${i}`,
    staffId,
    institutionId,
    token: `${prefix}-token-${i}`,
    platform: "android",
    lastUsedAt: now,
    createdAt: now,
  }));
  await db.insert(staffDeviceTokens).values(rows);
}

describe("FCM bulk push timeouts & tenant-scoped pruning", () => {
  beforeAll(async () => {
    process.env.FIREBASE_PROJECT_ID = "proj-item2";
    process.env.FIREBASE_CLIENT_EMAIL = "item2@item2.iam.gserviceaccount.com";
    process.env.FIREBASE_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\nfake\n-----END PRIVATE KEY-----";

    await db.run(
      sql`INSERT OR IGNORE INTO institutions (id, name, code) VALUES ('inst-item2-a', 'Item2 Inst A', 'IIA')`
    );
    await db.run(
      sql`INSERT OR IGNORE INTO institutions (id, name, code) VALUES ('inst-item2-b', 'Item2 Inst B', 'IIB')`
    );
    await db.run(
      sql`INSERT OR IGNORE INTO staff (id, employee_id, first_name, last_name, email, role) VALUES ('staff-item2-1', 'EMP_I2_1', 'Item', 'TwoOne', 'item2-one@test.com', 'staff')`
    );
    await db.run(
      sql`INSERT OR IGNORE INTO staff (id, employee_id, first_name, last_name, email, role) VALUES ('staff-item2-2', 'EMP_I2_2', 'Item', 'TwoTwo', 'item2-two@test.com', 'staff')`
    );
  });

  beforeEach(() => {
    mockSendEachForMulticast.mockReset();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await db.delete(notifications).where(eq(notifications.staffId, STAFF_ONE));
    await db.delete(notifications).where(eq(notifications.staffId, STAFF_TWO));
    await db.delete(staffDeviceTokens).where(eq(staffDeviceTokens.staffId, STAFF_ONE));
    await db.delete(staffDeviceTokens).where(eq(staffDeviceTokens.staffId, STAFF_TWO));
  });

  test("a multicast wave hanging past 12s times out per wave and the bulk call still returns", async () => {
    // 600 tokens -> 6 batches -> wave 1 (5 batches) + wave 2 (1 batch).
    await seedTokens("i2wave", 600, INSTITUTION_A, STAFF_ONE);
    mockSendEachForMulticast.mockImplementation(() => new Promise(() => undefined));

    const startedAt = Date.now();
    const result = await sendBulkPushNotifications({
      institutionId: INSTITUTION_A,
      staffIds: [STAFF_ONE],
      title: TEST_TITLE,
      message: TEST_MESSAGE,
      type: "general",
    });
    const elapsedMs = Date.now() - startedAt;

    expect(result.insertedCount).toBe(1);
    expect(result.deliveredCount).toBe(0);
    // Each wave is cut at 12s, and the loop continues into wave 2 rather than
    // hanging: ~24s total, still below the 45s deadline.
    expect(elapsedMs).toBeGreaterThanOrEqual(23000);
    expect(elapsedMs).toBeLessThan(30000);
  }, 60000);

  test("the 45s deadline breaks the wave loop early and returns partial counts", async () => {
    // 600 tokens -> 6 batches, so a full run needs two waves (6 send calls).
    await seedTokens("i2deadline", 600, INSTITUTION_A, STAFF_ONE);

    const realNow = Date.now.bind(Date);
    let clockOffsetMs = 0;
    jest.spyOn(Date, "now").mockImplementation(() => realNow() + clockOffsetMs);

    mockSendEachForMulticast.mockImplementation((payload: { tokens: string[] }) => {
      // Simulate the wall clock passing the 45s deadline once wave 1 is in flight.
      clockOffsetMs = FCM_TOTAL_DEADLINE_MS + 15000;
      return Promise.resolve({
        successCount: payload.tokens.length,
        failureCount: 0,
        responses: payload.tokens.map(() => ({ success: true })),
      });
    });

    const result = await sendBulkPushNotifications({
      institutionId: INSTITUTION_A,
      staffIds: [STAFF_ONE],
      title: TEST_TITLE,
      message: TEST_MESSAGE,
      type: "general",
    });

    // Wave 1 delivered 5 x 100 tokens; wave 2 (the remaining 100) never starts.
    expect(result.insertedCount).toBe(1);
    expect(result.deliveredCount).toBe(500);
    expect(mockSendEachForMulticast).toHaveBeenCalledTimes(5);
    expect(FCM_TOTAL_DEADLINE_MS).toBe(45000);
  }, 30000);

  test("a wave clamps timeout to remaining budget when under 12s", async () => {
    await seedTokens("i2clamp", 100, INSTITUTION_A, STAFF_ONE);

    const warnSpy = jest.spyOn(console, "warn");
    const realNow = Date.now.bind(Date);
    let callCount = 0;
    // Fast forward clock: startedAt is T0; when entering loop, 31s have elapsed
    // Remaining budget = 45s - 31s - 10s (margin) = 4,000ms (< 12,000ms wave timeout)
    jest.spyOn(Date, "now").mockImplementation(() => {
      callCount++;
      return callCount === 1 ? 1_000_000 : 1_031_000;
    });

    mockSendEachForMulticast.mockImplementation(() => new Promise(() => undefined));

    const result = await sendBulkPushNotifications({
      institutionId: INSTITUTION_A,
      staffIds: [STAFF_ONE],
      title: TEST_TITLE,
      message: TEST_MESSAGE,
      type: "general",
    });

    expect(result.deliveredCount).toBe(0);
    expect(warnSpy).toHaveBeenCalledWith(
      "[FCM PushService] Wave batch failed or timed out:",
      expect.objectContaining({
        reason: "FCM multicast wave timed out after 4000ms",
        batchSize: 100,
        institutionId: INSTITUTION_A,
      })
    );
  }, 30000);

  test("stale token pruning query includes institutionId for the tenant being notified", async () => {
    await seedTokens("i2scope-a", 1, INSTITUTION_A, STAFF_ONE);
    await seedTokens("i2scope-b", 1, INSTITUTION_B, STAFF_TWO);

    mockSendEachForMulticast.mockImplementation((payload: { tokens: string[] }) =>
      Promise.resolve({
        successCount: 0,
        failureCount: payload.tokens.length,
        responses: payload.tokens.map(() => ({
          success: false,
          error: { code: "messaging/registration-token-not-registered" },
        })),
      })
    );

    const originalDelete = db.delete.bind(db);
    let capturedWhere: unknown;
    const deleteSpy = jest
      .spyOn(db, "delete")
      .mockImplementation(((table: unknown) => {
        const builder = (originalDelete as (t: unknown) => any)(table);
        const originalWhere = builder.where.bind(builder);
        builder.where = (condition: unknown) => {
          capturedWhere = condition;
          return originalWhere(condition);
        };
        return builder;
      }) as typeof db.delete);

    try {
      await sendBulkPushNotifications({
        institutionId: INSTITUTION_A,
        staffIds: [STAFF_ONE],
        title: TEST_TITLE,
        message: TEST_MESSAGE,
        type: "general",
      });

      expect(capturedWhere).toBeDefined();
      const rendered = (originalDelete(staffDeviceTokens) as any).where(capturedWhere).toSQL();

      expect(rendered.sql).toContain("institution_id");
      expect(rendered.sql).toContain("token");
      expect(rendered.params).toContain(INSTITUTION_A);

      // The stale row for tenant A is pruned; tenant B's row is untouched.
      const rowA = await db
        .select()
        .from(staffDeviceTokens)
        .where(eq(staffDeviceTokens.token, "i2scope-a-token-0"))
        .get();
      const rowB = await db
        .select()
        .from(staffDeviceTokens)
        .where(eq(staffDeviceTokens.token, "i2scope-b-token-0"))
        .get();
      expect(rowA).toBeUndefined();
      expect(rowB).toBeDefined();
    } finally {
      deleteSpy.mockRestore();
    }
  }, 30000);

  test("absent institutionId skips pruning completely (no delete executed)", async () => {
    await seedTokens("i2plain", 1, INSTITUTION_A, STAFF_ONE);

    mockSendEachForMulticast.mockImplementation((payload: { tokens: string[] }) =>
      Promise.resolve({
        successCount: 0,
        failureCount: payload.tokens.length,
        responses: payload.tokens.map(() => ({
          success: false,
          error: { code: "messaging/invalid-registration-token" },
        })),
      })
    );

    const deleteSpy = jest.spyOn(db, "delete");

    try {
      await sendBulkPushNotifications({
        // Absent institutionId
        staffIds: [STAFF_ONE],
        title: TEST_TITLE,
        message: TEST_MESSAGE,
        type: "general",
      });

      // Strict requirement: absent institutionId skips pruning completely
      expect(deleteSpy).not.toHaveBeenCalled();

      // Row remains intact
      const row = await db
        .select()
        .from(staffDeviceTokens)
        .where(eq(staffDeviceTokens.token, "i2plain-token-0"))
        .get();
      expect(row).toBeDefined();
    } finally {
      deleteSpy.mockRestore();
    }
  }, 30000);

  test("late rejection from a timed-out multicast batch causes no unhandledRejection", async () => {
    await seedTokens("i2laterej", 10, INSTITUTION_A, STAFF_ONE);

    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => { unhandled.push(reason); };
    process.on("unhandledRejection", onUnhandled);

    try {
      // Mock multicast to reject 200ms AFTER the 12s wave ceiling
      mockSendEachForMulticast.mockImplementation(
        () => new Promise((_, reject) => setTimeout(() => reject(new Error("Late FCM gateway failure")), 12200))
      );

      const result = await sendBulkPushNotifications({
        institutionId: INSTITUTION_A,
        staffIds: [STAFF_ONE],
        title: TEST_TITLE,
        message: TEST_MESSAGE,
        type: "general",
      });

      expect(result.insertedCount).toBe(1);
      expect(result.deliveredCount).toBe(0);

      // Wait 500ms past the late rejection time to confirm no unhandledRejection was fired
      await new Promise((r) => setTimeout(r, 600));
      expect(unhandled).toEqual([]);
    } finally {
      process.off("unhandledRejection", onUnhandled);
    }
  }, 30000);
  test("emits push_wave_timeout structured JSON line to stderr on wave timeout", async () => {
    await seedTokens("i2events", 100, INSTITUTION_A, STAFF_ONE);

    const stderrWrites: string[] = [];
    const origWrite = process.stderr.write;
    process.stderr.write = ((chunk: any) => {
      stderrWrites.push(String(chunk));
      return true;
    }) as any;

    try {
      mockSendEachForMulticast.mockRejectedValueOnce(new Error("FCM multicast wave timed out after 12000ms"));

      await sendBulkPushNotifications({
        institutionId: INSTITUTION_A,
        staffIds: [STAFF_ONE],
        title: TEST_TITLE,
        message: TEST_MESSAGE,
        type: "general",
      });

      const waveTimeoutLog = stderrWrites.find((w) => w.includes("push_wave_timeout"));
      expect(waveTimeoutLog).toBeDefined();
      const parsed = JSON.parse(waveTimeoutLog!);
      expect(parsed.event).toBe("push_wave_timeout");
      expect(parsed.institutionId).toBe(INSTITUTION_A);
      expect(parsed.batchSize).toBe(100);
      expect(parsed.error).toContain("timed out");
    } finally {
      process.stderr.write = origWrite;
    }
  });
  test("emits push_budget_exhausted structured JSON line to stderr and skips wave when under 1000ms floor", async () => {
    await seedTokens("i2floor", 200, INSTITUTION_A, STAFF_ONE);

    const stderrWrites: string[] = [];
    const origWrite = process.stderr.write;
    process.stderr.write = ((chunk: any) => {
      stderrWrites.push(String(chunk));
      return true;
    }) as any;

    const realNow = Date.now.bind(Date);
    let calls = 0;
    jest.spyOn(Date, "now").mockImplementation(() => {
      calls++;
      if (calls === 1) return 1000000;
      return 1000000 + 34500;
    });

    try {
      const result = await sendBulkPushNotifications({
        institutionId: INSTITUTION_A,
        staffIds: [STAFF_ONE],
        title: TEST_TITLE,
        message: TEST_MESSAGE,
        type: "general",
      });

      expect(mockSendEachForMulticast).not.toHaveBeenCalled();
      expect(result.deliveredCount).toBe(0);

      const budgetLog = stderrWrites.find((w) => w.includes("push_budget_exhausted"));
      expect(budgetLog).toBeDefined();
      const parsed = JSON.parse(budgetLog!);
      expect(parsed.event).toBe("push_budget_exhausted");
      expect(parsed.institutionId).toBe(INSTITUTION_A);
      expect(parsed.remainingBatches).toBe(2);
      expect(parsed.unsentTokenCount).toBe(200);
    } finally {
      process.stderr.write = origWrite;
      jest.restoreAllMocks();
    }
  });
  test("emits fcm_missing_credentials structured JSON to stderr when VERCEL_ENV=production and credentials missing", async () => {
    const origWrite = process.stderr.write;
    const stderrWrites: string[] = [];
    process.stderr.write = ((chunk: any) => {
      stderrWrites.push(String(chunk));
      return true;
    }) as any;

    const origVercelEnv = process.env.VERCEL_ENV;
    process.env.VERCEL_ENV = "production";

    try {
      await seedTokens("fcm-missing", 1, INSTITUTION_A, STAFF_ONE);

      delete process.env.FIREBASE_PROJECT_ID;
      delete process.env.FIREBASE_CLIENT_EMAIL;
      delete process.env.FIREBASE_PRIVATE_KEY;

      await jest.isolateModulesAsync(async () => {
        const { sendPushNotification } = await import("@/lib/notifications/push-service");

        const res = await sendPushNotification({
          staffId: STAFF_ONE,
          title: TEST_TITLE,
          message: TEST_MESSAGE,
        });

        expect(res.deliveredCount).toBe(0);
      });

      const fcmLog = stderrWrites.find((w) => w.includes("fcm_missing_credentials"));
      expect(fcmLog).toBeDefined();
      const parsed = JSON.parse(fcmLog!);
      expect(parsed.event).toBe("fcm_missing_credentials");
      expect(parsed.error).toContain("FIREBASE credentials");
    } finally {
      process.stderr.write = origWrite;
      process.env.VERCEL_ENV = origVercelEnv;
    }
  });
});
