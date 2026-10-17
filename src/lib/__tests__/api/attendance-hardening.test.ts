/**
 * @jest-environment node
 *
 * Attendance & Presence Engine perfection pass — hardening suite:
 * - Overnight cross-day shift checkout (fallback + anchored shift-end math)
 * - Check-in debounce idempotency (double-tap → 200 duplicate, not 400)
 * - Concurrent check-in unique-race and atomic check-out 409 guard
 * - Negative workedMinutes protection (clock skew) + earlyExit clamping
 * - Multi-tenant / cross-staff boundary on /logs and /violations
 */
import {
  db,
  institutions,
  staff,
  staffInstitutions,
  shifts,
  staffShifts,
  attendanceLogs,
} from "@/db";
import { verifySession } from "@thaiba/auth";
import { eq } from "drizzle-orm";
import { POST as checkInPost } from "@/app/api/attendance/check-in/route";
import { POST as checkOutPost } from "@/app/api/attendance/check-out/route";
import { GET as logsGet } from "@/app/api/attendance/logs/route";
import { GET as violationsGet } from "@/app/api/attendance/violations/route";

jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: jest.fn(),
    hasPermission: jest.fn().mockReturnValue(true),
  };
});

jest.mock("@/lib/attendance/validation", () => {
  const actual = jest.requireActual("@/lib/attendance/validation");
  return {
    ...actual,
    validateNfcCheckIn: jest.fn().mockResolvedValue(undefined),
    validateQrCheckIn: jest.fn().mockResolvedValue(undefined),
  };
});

jest.mock("@/lib/features", () => {
  const actual = jest.requireActual("@/lib/features");
  return {
    ...actual,
    isPresenceTrackingEnabled: () => false,
  };
});

const BASE = new Date(2026, 9, 13, 21, 5, 0, 0); // 2026-10-13 21:05 local
const at = (dayOffset: number, h: number, m = 0): Date =>
  new Date(2026, 9, 13 + dayOffset, h, m, 0, 0);
const iso = (d: Date): string => d.toISOString();

describe("Attendance & Presence hardening — overnight shifts, debounce, atomic checkout, tenant scope", () => {
  const suffix = Math.random().toString(36).slice(2, 10);
  const inst1 = `inst_atd_1_${suffix}`;
  const inst2 = `inst_atd_2_${suffix}`;
  const staffNight = `stf_atd_night_${suffix}`;
  const staffDay = `stf_atd_day_${suffix}`;
  const staffOther = `stf_atd_other_${suffix}`;
  const adminUser = `stf_atd_admin_${suffix}`;
  const shiftNightId = `shf_atd_n_${suffix}`;
  const shiftDayId = `shf_atd_d_${suffix}`;
  const otherLogId = `log_atd_other_${suffix}`;
  const otherViolationId = `log_atd_oviol_${suffix}`;
  const dayViolationId = `log_atd_dviol_${suffix}`;

  const setSession = (payload: Record<string, unknown>) =>
    (verifySession as jest.Mock).mockResolvedValue({
      permissions: ["*"],
      ...payload,
    });
  const sessionFor = (
    staffId: string,
    institutionId: string,
    role = "staff"
  ) => ({
    staffId,
    role,
    institutionId,
    email: `${staffId}@atd.test`,
  });

  const checkInReq = (body: Record<string, unknown>) =>
    new Request("http://localhost/api/attendance/check-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  const checkOutReq = () =>
    new Request("http://localhost/api/attendance/check-out", { method: "POST" });
  const checkIn = (body: Record<string, unknown>) =>
    checkInPost(checkInReq(body)) as Promise<Response>;
  const checkOut = () => checkOutPost(checkOutReq()) as Promise<Response>;
  const nfcPunch = { method: "nfc", nfcTagId: `tag_${suffix}` };

  const logRow = (id: string) =>
    db.select().from(attendanceLogs).where(eq(attendanceLogs.id, id)).get();

  beforeAll(async () => {
    jest.useFakeTimers({
      now: BASE,
      doNotFake: [
        "nextTick",
        "queueMicrotask",
        "setImmediate",
        "clearImmediate",
        "setTimeout",
        "clearTimeout",
        "setInterval",
        "clearInterval",
        "hrtime",
        "performance",
      ],
    });

    await db.insert(institutions).values([
      { id: inst1, name: `AttdHardening 1 ${suffix}`, code: `ah1${suffix.slice(-5)}` },
      { id: inst2, name: `AttdHardening 2 ${suffix}`, code: `ah2${suffix.slice(-5)}` },
    ]);
    await db.insert(staff).values([
      { id: staffNight, email: `night_${suffix}@atd.test`, employeeId: `EMP_ATD_N_${suffix.slice(-6)}`, firstName: "Night", lastName: "Worker", role: "staff", isActive: true, tokenVersion: 0 },
      { id: staffDay, email: `day_${suffix}@atd.test`, employeeId: `EMP_ATD_D_${suffix.slice(-6)}`, firstName: "Day", lastName: "Worker", role: "staff", isActive: true, tokenVersion: 0 },
      { id: staffOther, email: `other_${suffix}@atd.test`, employeeId: `EMP_ATD_O_${suffix.slice(-6)}`, firstName: "Other", lastName: "Worker", role: "staff", isActive: true, tokenVersion: 0 },
      { id: adminUser, email: `admin_${suffix}@atd.test`, employeeId: `EMP_ATD_A_${suffix.slice(-6)}`, firstName: "Attd", lastName: "Admin", role: "admin", isActive: true, tokenVersion: 0 },
    ]);
    await db.insert(staffInstitutions).values([
      { id: `si_atd_n_${suffix}`, staffId: staffNight, institutionId: inst1 },
      { id: `si_atd_d_${suffix}`, staffId: staffDay, institutionId: inst1 },
      { id: `si_atd_o_${suffix}`, staffId: staffOther, institutionId: inst2 },
      { id: `si_atd_a_${suffix}`, staffId: adminUser, institutionId: inst1 },
    ]);
    await db.insert(shifts).values([
      { id: shiftNightId, name: "Night 21-06", startTime: "21:00", endTime: "06:00", gracePeriodMinutes: 10, isActive: true, applicableToAll: false },
      { id: shiftDayId, name: "Day 09-17", startTime: "09:00", endTime: "17:00", gracePeriodMinutes: 15, isActive: true, applicableToAll: false },
    ]);
    await db.insert(staffShifts).values([
      { id: `ss_atd_n_${suffix}`, staffId: staffNight, shiftId: shiftNightId, effectiveFrom: "2000-01-01" },
      { id: `ss_atd_d_${suffix}`, staffId: staffDay, shiftId: shiftDayId, effectiveFrom: "2000-01-01" },
    ]);

    // Cross-tenant / cross-staff fixtures for read-endpoint boundaries.
    await db.insert(attendanceLogs).values([
      { id: otherLogId, staffId: staffOther, institutionId: inst2, date: "2026-10-01", checkIn: iso(at(-12, 9)), checkOut: iso(at(-12, 17)), status: "present", workedMinutes: 480 },
      { id: otherViolationId, staffId: staffOther, institutionId: inst2, date: "2026-10-02", status: "present", geofenceViolations: 3 },
      { id: dayViolationId, staffId: staffDay, institutionId: inst1, date: "2026-10-02", status: "present", geofenceViolations: 2 },
    ]);
  });

  afterEach(() => {
    jest.setSystemTime(BASE);
    (verifySession as jest.Mock).mockReset();
  });

  describe("overnight cross-day shifts", () => {
    it("checks out the next morning with shift end anchored to the check-in day + 1", async () => {
      setSession(sessionFor(staffNight, inst1));
      jest.setSystemTime(at(0, 21, 5)); // Day 1, 21:05

      const inRes = await checkIn(nfcPunch);
      expect(inRes.status).toBe(201);

      jest.setSystemTime(at(1, 5, 30)); // Day 2, 05:30
      const outRes = await checkOut();
      expect(outRes.status).toBe(200);
      const { log } = await outRes.json();

      expect(log.date).toBe("2026-10-13"); // still the Day-1 attendance row
      expect(log.checkOut).toBeTruthy();
      expect(log.workedMinutes).toBe(505); // 21:05 → 05:30
      expect(log.earlyExitMinutes).toBe(30); // 06:00 − 05:30
    });

    it("measures early exit before midnight against the NEXT day's shift end", async () => {
      setSession(sessionFor(staffNight, inst1));
      jest.setSystemTime(at(2, 21, 5)); // Day 3, 21:05

      const inRes = await checkIn(nfcPunch);
      expect(inRes.status).toBe(201);

      jest.setSystemTime(at(2, 23, 0)); // same day, 23:00
      const outRes = await checkOut();
      expect(outRes.status).toBe(200);
      const { log } = await outRes.json();

      expect(log.workedMinutes).toBe(115); // 21:05 → 23:00
      expect(log.earlyExitMinutes).toBe(420); // 23:00 → next-day 06:00
    });

    it("records zero early exit when checking out exactly at the overnight shift end", async () => {
      setSession(sessionFor(staffNight, inst1));
      jest.setSystemTime(at(4, 21, 5));

      const inRes = await checkIn(nfcPunch);
      expect(inRes.status).toBe(201);

      jest.setSystemTime(at(5, 6, 0));
      const outRes = await checkOut();
      expect(outRes.status).toBe(200);
      const { log } = await outRes.json();

      expect(log.workedMinutes).toBe(535); // 21:05 → 06:00
      expect(log.earlyExitMinutes).toBe(0);
    });

    it("does NOT apply the yesterday fallback to a forgotten normal-shift check-in", async () => {
      setSession(sessionFor(staffDay, inst1));
      jest.setSystemTime(at(0, 9, 5));

      const inRes = await checkIn(nfcPunch);
      expect(inRes.status).toBe(201);

      jest.setSystemTime(at(1, 10, 0)); // next morning, normal 09-17 shift
      const outRes = await checkOut();
      expect(outRes.status).toBe(400);
      const data = await outRes.json();
      expect(String(data.error)).toContain("No check-in found for today");
    });
  });

  describe("check-in debounce idempotency", () => {
    it("returns the active check-in with duplicate:true within the 60s window", async () => {
      setSession(sessionFor(staffDay, inst1));
      jest.setSystemTime(at(5, 9, 0));

      const first = await checkIn(nfcPunch);
      expect(first.status).toBe(201);
      const firstData = await first.json();

      jest.setSystemTime(at(5, 9, 0, )); // same instant double-tap
      const second = await checkIn(nfcPunch);
      expect(second.status).toBe(200);
      const secondData = await second.json();

      expect(secondData.duplicate).toBe(true);
      expect(secondData.log.id).toBe(firstData.log.id);
    });

    it("still rejects a re-check-in once the debounce window has elapsed", async () => {
      setSession(sessionFor(staffDay, inst1));
      jest.setSystemTime(at(5, 9, 0));
      await checkIn(nfcPunch);

      jest.setSystemTime(at(5, 9, 2)); // +120 seconds, well past the 60s window
      const late = await checkIn(nfcPunch);
      expect(late.status).toBe(400);
      const data = await late.json();
      expect(String(data.error)).toContain("Already checked in today");
    });

    it("rejects re-check-in after checkout even inside the debounce window", async () => {
      setSession(sessionFor(staffDay, inst1));
      jest.setSystemTime(at(6, 9, 0));
      await checkIn(nfcPunch);

      jest.setSystemTime(at(6, 12, 0));
      const outRes = await checkOut();
      expect(outRes.status).toBe(200);

      jest.setSystemTime(at(6, 12, 0, )); // immediately after checkout
      const again = await checkIn(nfcPunch);
      expect(again.status).toBe(400);
    });

    it("resolves a concurrent double-punch race via the unique index + debounce", async () => {
      setSession(sessionFor(staffNight, inst1));
      jest.setSystemTime(at(8, 21, 0));

      const [a, b] = await Promise.all([checkIn(nfcPunch), checkIn(nfcPunch)]);
      const statuses = [a.status, b.status].sort((x, y) => x - y);
      expect(statuses).toEqual([200, 201]);

      const winner = a.status === 201 ? a : b;
      const loser = a.status === 200 ? a : b;
      const winnerData = await winner.json();
      const loserData = await loser.json();
      expect(loserData.duplicate).toBe(true);
      expect(loserData.log.id).toBe(winnerData.log.id);
    });
  });

  describe("atomic check-out & worked-minute guards", () => {
    it("serializes concurrent check-outs: exactly one 200, one 409", async () => {
      setSession(sessionFor(staffNight, inst1));
      jest.setSystemTime(at(10, 21, 5));
      const inRes = await checkIn(nfcPunch);
      expect(inRes.status).toBe(201);

      jest.setSystemTime(at(11, 5, 0));
      const [a, b] = await Promise.all([checkOut(), checkOut()]);
      const statuses = [a.status, b.status].sort((x, y) => x - y);
      expect(statuses).toEqual([200, 409]);

      const err = a.status === 409 ? a : b;
      const errData = await err.json();
      expect(String(errData.error)).toContain("Already checked out");
    });

    it("clamps workedMinutes to zero when the stored check-in is in the future (clock skew)", async () => {
      setSession(sessionFor(staffDay, inst1));
      jest.setSystemTime(at(12, 9, 0));

      const skewId = `log_atd_skew_${suffix}`;
      await db.insert(attendanceLogs).values({
        id: skewId,
        staffId: staffDay,
        institutionId: inst1,
        date: "2026-10-25",
        checkIn: iso(at(12, 9, 10)), // 10 minutes in the future
        status: "present",
      });

      const outRes = await checkOut();
      expect(outRes.status).toBe(200);
      const { log } = await outRes.json();
      expect(log.id).toBe(skewId);
      expect(log.workedMinutes).toBe(0);
      expect(log.earlyExitMinutes).toBeGreaterThanOrEqual(0);
    });

    it("records positive worked minutes and zero early exit for a past-end same-day checkout", async () => {
      setSession(sessionFor(staffDay, inst1));
      jest.setSystemTime(at(14, 9, 0));
      const inRes = await checkIn(nfcPunch);
      expect(inRes.status).toBe(201);

      jest.setSystemTime(at(14, 17, 30));
      const outRes = await checkOut();
      expect(outRes.status).toBe(200);
      const { log } = await outRes.json();
      expect(log.workedMinutes).toBe(510);
      expect(log.earlyExitMinutes).toBe(0);
    });
  });

  describe("multi-tenant & cross-staff read boundaries", () => {
    it("scopes a staff member's /logs response to their own rows only", async () => {
      setSession(sessionFor(staffDay, inst1));
      const res = await logsGet(
        new Request("http://localhost/api/attendance/logs")
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      const ids: string[] = data.logs.map((l: { id: string }) => l.id);
      expect(ids).not.toContain(otherLogId);
      expect(ids).not.toContain(otherViolationId);
      const staffIds = data.logs.map((l: { staffId?: string }) => l.staffId);
      expect(staffIds.every((s: string | undefined) => !s || s === staffDay)).toBe(true);
    });

    it("scopes an admin's /logs response to their own institution's staff", async () => {
      setSession(sessionFor(adminUser, inst1, "admin"));
      const res = await logsGet(
        new Request("http://localhost/api/attendance/logs?institutionId=" + inst2)
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      const ids: string[] = data.logs.map((l: { id: string }) => l.id);
      // Membership wins over the requested foreign institution.
      expect(ids).not.toContain(otherLogId);
      expect(ids.some((id) => id === dayViolationId)).toBe(true);
    });

    it("keeps /violations inside the requesting admin's institution", async () => {
      setSession(sessionFor(adminUser, inst1, "admin"));
      const res = await violationsGet(
        new Request("http://localhost/api/attendance/violations")
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      const ids: string[] = data.violations.map(
        (v: { id: string }) => v.id
      );
      expect(ids).toContain(dayViolationId);
      expect(ids).not.toContain(otherViolationId);
      expect(data.stats.totalOccurrences).toBe(2);
    });
  });
});
