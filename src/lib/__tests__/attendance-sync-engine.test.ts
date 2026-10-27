import {
  calculateHaversineDistanceMeters,
  deriveLocalDate,
  formatLocalTime,
  processAttendanceSyncBatch,
  rebuildAttendanceDayProjection,
} from "../attendance/sync-engine";
import { isFrozenPilotPath, pilotFrozenModuleResponse } from "../attendance/pilot-gate";
import { ensureAttendanceEventTablesExist } from "../attendance/migration-sqlite";
import { db, attendanceEvents, attendanceDays, punchAttempts, attendanceLogs, staff, institutions } from "@/db";
import { eq, and } from "drizzle-orm";

describe("Version 1.0 Attendance Event-Sourcing & Sync Engine Test Suite", () => {
  const testStaffId = "staff_test_pilot_001";
  const testInstId = "inst_test_pilot_001";

  beforeAll(async () => {
    await ensureAttendanceEventTablesExist();

    // Seed test institution if missing
    await db
      .insert(institutions)
      .values({
        id: testInstId,
        name: "Pilot Test Campus",
        code: "PILOT-TEST-001",
      })
      .onConflictDoNothing();

    // Seed test staff if missing
    await db
      .insert(staff)
      .values({
        id: testStaffId,
        email: "pilot.tester@thaibahive.internal",
        firstName: "Pilot",
        lastName: "Tester",
        role: "teacher",
        employeeId: "EMP-PILOT-001",
      })
      .onConflictDoNothing();
  });

  beforeEach(async () => {
    // Clean up test events
    await db.delete(attendanceEvents).where(eq(attendanceEvents.staffId, testStaffId));
    await db.delete(attendanceDays).where(eq(attendanceDays.staffId, testStaffId));
    await db.delete(punchAttempts).where(eq(punchAttempts.staffId, testStaffId));
    await db.delete(attendanceLogs).where(eq(attendanceLogs.staffId, testStaffId));
  });

  afterAll(async () => {
    await db.delete(attendanceEvents).where(eq(attendanceEvents.staffId, testStaffId));
    await db.delete(attendanceDays).where(eq(attendanceDays.staffId, testStaffId));
    await db.delete(punchAttempts).where(eq(punchAttempts.staffId, testStaffId));
    await db.delete(attendanceLogs).where(eq(attendanceLogs.staffId, testStaffId));
    await db.delete(staff).where(eq(staff.id, testStaffId));
    await db.delete(institutions).where(eq(institutions.id, testInstId));
  });

  describe("1. Geodesic & Timezone Calculations", () => {
    it("should accurately compute distance between two GPS coordinates", () => {
      // 100 meters north approximately
      const distance = calculateHaversineDistanceMeters(11.2588, 75.7804, 11.2597, 75.7804);
      expect(Math.round(distance)).toBeGreaterThanOrEqual(95);
      expect(Math.round(distance)).toBeLessThanOrEqual(105);
    });

    it("should compute identical location distance as 0", () => {
      const distance = calculateHaversineDistanceMeters(11.2588, 75.7804, 11.2588, 75.7804);
      expect(distance).toBe(0);
    });

    it("should derive local date in Asia/Kolkata timezone regardless of host system", () => {
      // 2026-10-25 18:30 UTC = 2026-10-26 00:00 IST (+5:30)
      const lateUtcEpoch = new Date("2026-10-25T19:00:00Z").getTime();
      const localDate = deriveLocalDate(lateUtcEpoch, "Asia/Kolkata");
      expect(localDate).toBe("2026-10-26");
    });
  });

  describe("2. Sync Batch Ingestion & Idempotency", () => {
    it("should successfully ingest valid check-in and check-out events", async () => {
      // Use fixed daytime interval on the same calendar day to be deterministic across any time of day
      const base = new Date("2026-10-26T04:00:00Z").getTime(); // 09:30 AM IST
      const morningEpoch = base;
      const eveningEpoch = base + 8 * 3600 * 1000; // 05:30 PM IST
      const expectedMinutes = Math.round((eveningEpoch - morningEpoch) / 60000);

      const response = await processAttendanceSyncBatch(
        testStaffId,
        testInstId,
        {
          events: [
            {
              clientEventId: "evt_uuid_001_in",
              kind: "in",
              method: "geofence",
              deviceClaimedAt: morningEpoch,
              clockOffsetMs: 0,
              latitude: 11.2588,
              longitude: 75.7804,
              accuracyM: 15,
            },
            {
              clientEventId: "evt_uuid_002_out",
              kind: "out",
              method: "geofence",
              deviceClaimedAt: eveningEpoch,
              clockOffsetMs: 0,
              latitude: 11.2588,
              longitude: 75.7804,
              accuracyM: 20,
            },
          ],
        },
        { requestId: "req_test_001" }
      );

      expect(response.results).toHaveLength(2);
      expect(response.results[0].status).toBe("accepted");
      expect(response.results[0].clientEventId).toBe("evt_uuid_001_in");
      expect(response.results[1].status).toBe("accepted");
      expect(response.results[1].clientEventId).toBe("evt_uuid_002_out");

      // Verify projection rebuilt
      const day = await db
        .select()
        .from(attendanceDays)
        .where(eq(attendanceDays.staffId, testStaffId))
        .limit(1);

      expect(day).toHaveLength(1);
      expect(day[0].firstIn).toBe(morningEpoch);
      expect(day[0].lastOut).toBe(eveningEpoch);
      expect(day[0].totalMinutes).toBe(expectedMinutes);
      expect(day[0].status).toBe("present");
    });

    it("should handle duplicate clientEventId idempotently without double-counting", async () => {
      const epoch = Date.now();
      const firstRun = await processAttendanceSyncBatch(
        testStaffId,
        testInstId,
        {
          events: [
            {
              clientEventId: "evt_idempotent_test_001",
              kind: "in",
              method: "geofence",
              deviceClaimedAt: epoch,
            },
          ],
        },
        { requestId: "req_dup_1" }
      );

      expect(firstRun.results[0].status).toBe("accepted");

      // Second submission with exact same clientEventId
      const secondRun = await processAttendanceSyncBatch(
        testStaffId,
        testInstId,
        {
          events: [
            {
              clientEventId: "evt_idempotent_test_001",
              kind: "in",
              method: "geofence",
              deviceClaimedAt: epoch,
            },
          ],
        },
        { requestId: "req_dup_2" }
      );

      expect(secondRun.results[0].status).toBe("duplicate");
      expect(secondRun.results[0].clientEventId).toBe("evt_idempotent_test_001");

      // Verify only 1 event exists in database
      const count = await db
        .select()
        .from(attendanceEvents)
        .where(eq(attendanceEvents.clientEventId, "evt_idempotent_test_001"));
      expect(count).toHaveLength(1);
    });

    it("should accept valid items even when a poisoned item is mixed into the batch", async () => {
      const epoch = Date.now();
      const response = await processAttendanceSyncBatch(
        testStaffId,
        testInstId,
        {
          events: [
            {
              clientEventId: "evt_valid_item_001",
              kind: "in",
              method: "geofence",
              deviceClaimedAt: epoch,
            },
            {
              clientEventId: "", // Poisoned: missing ID
              kind: "in",
              method: "geofence",
            },
            {
              clientEventId: "evt_invalid_kind_002",
              kind: "invalid_action" as any, // Poisoned: invalid kind
              method: "geofence",
            },
            {
              clientEventId: "evt_valid_item_002",
              kind: "out",
              method: "geofence",
              deviceClaimedAt: epoch + 3600000,
            },
          ],
        },
        { requestId: "req_poison_test" }
      );

      expect(response.results).toHaveLength(4);
      expect(response.results[0].status).toBe("accepted");
      expect(response.results[1].status).toBe("rejected"); // Poison dropped
      expect(response.results[2].status).toBe("rejected"); // Poison dropped
      expect(response.results[3].status).toBe("accepted"); // Valid succeeded
    });
  });

  describe("3. Out-Of-Order & Anomaly Handling", () => {
    it("should resolve cleanly when check-out arrives before offline check-in syncs", async () => {
      const now = Date.now();
      const morningEpoch = now - 6 * 3600 * 1000; // 6 hours ago
      const eveningEpoch = now - 15 * 60 * 1000; // 15 mins ago

      // Step 1: Check-out arrives FIRST (e.g. at 5 PM online)
      const outFirst = await processAttendanceSyncBatch(
        testStaffId,
        testInstId,
        {
          events: [
            {
              clientEventId: "evt_out_arrived_first",
              kind: "out",
              method: "geofence",
              deviceClaimedAt: eveningEpoch,
            },
          ],
        },
        { requestId: "req_order_1" }
      );

      expect(outFirst.results[0].status).toBe("accepted");

      // Verify projection flags orphan_out
      let day = await db
        .select()
        .from(attendanceDays)
        .where(eq(attendanceDays.staffId, testStaffId))
        .limit(1);

      expect(day[0].lastOut).toBe(eveningEpoch);
      expect(day[0].firstIn).toBeNull();
      expect(day[0].needsReview).toBe(true);
      expect(day[0].reviewReason).toContain("orphan_out");

      // Step 2: Delayed offline check-in arrives later (syncs at 5:20 PM)
      const inSecond = await processAttendanceSyncBatch(
        testStaffId,
        testInstId,
        {
          events: [
            {
              clientEventId: "evt_in_arrived_second",
              kind: "in",
              method: "nfc",
              deviceClaimedAt: morningEpoch,
            },
          ],
        },
        { requestId: "req_order_2" }
      );

      expect(inSecond.results[0].status).toBe("accepted");

      // Verify projection rebuilt: both firstIn and lastOut are restored!
      day = await db
        .select()
        .from(attendanceDays)
        .where(eq(attendanceDays.staffId, testStaffId))
        .limit(1);

      expect(day[0].firstIn).toBe(morningEpoch);
      expect(day[0].lastOut).toBe(eveningEpoch);
      expect(day[0].totalMinutes).toBe(Math.round((eveningEpoch - morningEpoch) / 60000));
      expect(day[0].status).toBe("present");
    });

    it("should flag mock location and poor accuracy without dropping the punch", async () => {
      const response = await processAttendanceSyncBatch(
        testStaffId,
        testInstId,
        {
          events: [
            {
              clientEventId: "evt_mock_gps_001",
              kind: "in",
              method: "geofence",
              isMocked: true,
              accuracyM: 150, // poor accuracy > 100m
              deviceClaimedAt: Date.now(),
            },
          ],
        },
        { requestId: "req_mock_test" }
      );

      expect(response.results[0].status).toBe("accepted");

      const event = await db
        .select()
        .from(attendanceEvents)
        .where(eq(attendanceEvents.clientEventId, "evt_mock_gps_001"))
        .limit(1);

      expect(event[0].isMocked).toBe(true);
      expect(event[0].flags).toContain("mock_location");
      expect(event[0].flags).toContain("poor_accuracy");

      const day = await db
        .select()
        .from(attendanceDays)
        .where(eq(attendanceDays.staffId, testStaffId))
        .limit(1);

      expect(day[0].needsReview).toBe(true);
    });
  });

  describe("4. Frozen Pilot Module Route Gating (Contract Criterion 5)", () => {
    it("should detect frozen pilot paths and map them to their module", () => {
      expect(isFrozenPilotPath("/api/finance/ledgers")).toBe("finance");
      expect(isFrozenPilotPath("/api/payroll/generate")).toBe("finance");
      expect(isFrozenPilotPath("/api/fleet/vehicles")).toBe("fleet");
      expect(isFrozenPilotPath("/api/conferencing/rooms")).toBe("conferencing");
      expect(isFrozenPilotPath("/api/canteen/orders")).toBe("canteen");
      expect(isFrozenPilotPath("/api/workflow-studio/deploy")).toBe("workflow_studio");
      expect(isFrozenPilotPath("/api/digital-twin/sync")).toBe("digital_twin");
    });

    it("should allow core Version 1.0 active paths", () => {
      expect(isFrozenPilotPath("/api/attendance/sync")).toBeNull();
      expect(isFrozenPilotPath("/api/attendance/check-in")).toBeNull();
      expect(isFrozenPilotPath("/api/reports")).toBeNull();
      expect(isFrozenPilotPath("/api/leaves")).toBeNull();
      expect(isFrozenPilotPath("/api/tasks")).toBeNull();
    });

    it("should generate a strict 403 response for frozen modules", async () => {
      const response = pilotFrozenModuleResponse("finance");
      expect(response.status).toBe(403);
      const json = await response.json();
      expect(json.error).toContain("frozen for the Version 1.0 Pilot");
      expect(json.module).toBe("finance");
      expect(json.status).toBe("frozen_for_pilot");
    });
  });

  describe("5. Hard Edge Cases & Concurrency Acceptance Criteria", () => {
    it("should ignore forged staffId or institutionId in payload and strictly enforce session auth", async () => {
      const forgedPayloadItem = {
        clientEventId: "evt_forged_tenant_001",
        kind: "in" as const,
        method: "geofence" as const,
        deviceClaimedAt: Date.now() - 3600 * 1000,
        staffId: "attacker_forged_staff_999",
        institutionId: "attacker_forged_inst_888",
      };

      const response = await processAttendanceSyncBatch(
        testStaffId,
        testInstId,
        { events: [forgedPayloadItem as any] },
        { requestId: "req_forge_isolation_test" }
      );

      expect(response.results[0].status).toBe("accepted");

      const savedEvent = await db
        .select()
        .from(attendanceEvents)
        .where(eq(attendanceEvents.clientEventId, "evt_forged_tenant_001"))
        .limit(1);

      expect(savedEvent.length).toBe(1);
      expect(savedEvent[0].staffId).toBe(testStaffId);
      expect(savedEvent[0].institutionId).toBe(testInstId);
      expect(savedEvent[0].staffId).not.toBe("attacker_forged_staff_999");
    });

    it("should handle concurrent sync batches for the same staff and day using Promise.all producing one consistent projection", async () => {
      const today = deriveLocalDate(Date.now());
      const now = Date.now();
      const inEpoch = now - 4 * 3600 * 1000;
      const outEpoch = now - 1 * 3600 * 1000;

      const batch1 = processAttendanceSyncBatch(
        testStaffId,
        testInstId,
        {
          events: [
            {
              clientEventId: "evt_concurrent_001_in",
              kind: "in",
              method: "geofence",
              deviceClaimedAt: inEpoch,
            },
          ],
        },
        { requestId: "req_concurrent_1" }
      );

      const batch2 = processAttendanceSyncBatch(
        testStaffId,
        testInstId,
        {
          events: [
            {
              clientEventId: "evt_concurrent_002_out",
              kind: "out",
              method: "geofence",
              deviceClaimedAt: outEpoch,
            },
          ],
        },
        { requestId: "req_concurrent_2" }
      );

      const [res1, res2] = await Promise.all([batch1, batch2]);

      expect(res1.results[0].status).toBe("accepted");
      expect(res2.results[0].status).toBe("accepted");

      const days = await db
        .select()
        .from(attendanceDays)
        .where(
          and(
            eq(attendanceDays.staffId, testStaffId),
            eq(attendanceDays.localDate, today)
          )
        );

      expect(days.length).toBe(1);
      expect(days[0].firstIn).toBe(inEpoch);
      expect(days[0].lastOut).toBe(outEpoch);
      expect(days[0].totalMinutes).toBe(180);
    });

    it("should reject batch size overflow exceeding MAX_BATCH_SIZE (50 items)", async () => {
      const items51 = Array.from({ length: 51 }, (_, i) => ({
        clientEventId: `evt_overflow_${i}`,
        kind: "in" as const,
        method: "geofence" as const,
      }));

      const response = await processAttendanceSyncBatch(
        testStaffId,
        testInstId,
        { events: items51 },
        { requestId: "req_overflow_test" }
      );

      expect(response.results.length).toBe(1);
      expect(response.results[0].status).toBe("rejected");
      expect(response.results[0].reason).toContain("Batch size exceeds limit of 50 items");
    });

    it("should correctly project punches near midnight IST (23:59 vs 00:01) to distinct dates", async () => {
      // 2026-10-25 23:59:00 IST = 2026-10-25 18:29:00 UTC
      const epochDay1 = new Date("2026-10-24T18:29:00.000Z").getTime();
      // 2026-10-26 00:01:00 IST = 2026-10-25 18:31:00 UTC
      const epochDay2 = new Date("2026-10-24T18:31:00.000Z").getTime();

      const date1 = deriveLocalDate(epochDay1, "Asia/Kolkata");
      const date2 = deriveLocalDate(epochDay2, "Asia/Kolkata");

      expect(date1).toBe("2026-10-24");
      expect(date2).toBe("2026-10-25");

      const response = await processAttendanceSyncBatch(
        testStaffId,
        testInstId,
        {
          events: [
            {
              clientEventId: "evt_midnight_day1_out",
              kind: "out",
              method: "geofence",
              deviceClaimedAt: epochDay1,
            },
            {
              clientEventId: "evt_midnight_day2_in",
              kind: "in",
              method: "geofence",
              deviceClaimedAt: epochDay2,
            },
          ],
        },
        { requestId: "req_midnight_test" }
      );

      expect(response.results.length).toBe(2);
      expect(response.results[0].status).toBe("accepted");
      expect(response.results[1].status).toBe("accepted");

      const day1 = await db
        .select()
        .from(attendanceDays)
        .where(
          and(
            eq(attendanceDays.staffId, testStaffId),
            eq(attendanceDays.localDate, "2026-10-24")
          )
        );

      const day2 = await db
        .select()
        .from(attendanceDays)
        .where(
          and(
            eq(attendanceDays.staffId, testStaffId),
            eq(attendanceDays.localDate, "2026-10-25")
          )
        );

      expect(day1.length).toBe(1);
      expect(day1[0].lastOut).toBe(epochDay1);

      expect(day2.length).toBe(1);
      expect(day2[0].firstIn).toBe(epochDay2);
    });

    it("should flag invalid sequence when lastOut is earlier than firstIn and require supervisor review", async () => {
      const today = deriveLocalDate(Date.now());
      const now = Date.now();
      const morningOut = now - 5 * 3600 * 1000; // 9:00 AM (out)
      const eveningIn = now - 1 * 3600 * 1000; // 1:00 PM (in)

      const response = await processAttendanceSyncBatch(
        testStaffId,
        testInstId,
        {
          events: [
            {
              clientEventId: "evt_seq_out_morning",
              kind: "out",
              method: "geofence",
              deviceClaimedAt: morningOut,
            },
            {
              clientEventId: "evt_seq_in_evening",
              kind: "in",
              method: "geofence",
              deviceClaimedAt: eveningIn,
            },
          ],
        },
        { requestId: "req_seq_anom_test" }
      );

      expect(response.results.length).toBe(2);

      const day = await db
        .select()
        .from(attendanceDays)
        .where(
          and(
            eq(attendanceDays.staffId, testStaffId),
            eq(attendanceDays.localDate, today)
          )
        );

      expect(day.length).toBe(1);
      expect(day[0].needsReview).toBe(true);
      expect(day[0].reviewReason).toContain("invalid_sequence: lastOut is earlier than firstIn");
      expect(day[0].totalMinutes).toBe(0);
    });
  });
});
