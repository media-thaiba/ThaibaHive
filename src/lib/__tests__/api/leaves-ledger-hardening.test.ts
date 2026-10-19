/**
 * @jest-environment node
 *
 * Leave Management Engine perfection pass — ledger integrity suite:
 * - Pending-day reservation against the balance (no overcommit at creation)
 * - Overlapping date collision rejection (active statuses only)
 * - Atomic approval capacity guard (usedDays can never exceed totalDays)
 * - Calendar-year anchoring (deduction follows the leave's start year)
 * - Delete credits approved leaves back to the balance
 * - Two-stage (HOD → admin) approval deducts only on final approval
 */
import {
  db,
  institutions,
  staff,
  staffInstitutions,
  departments,
  staffDepartments,
  leaveTypes,
  leaveBalances,
  leaveRequests,
} from "@/db";
import { verifySession } from "@thaiba/auth";
import { and, eq } from "drizzle-orm";
import { POST as leavesPost, GET as leavesGet } from "@/app/api/leaves/route";
import {
  GET as leaveGet,
  PUT as leavePut,
  DELETE as leaveDelete,
} from "@/app/api/leaves/[id]/route";

jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: jest.fn(),
    hasPermission: jest.fn().mockReturnValue(true),
  };
});

jest.mock("next/server", () => {
  const actual = jest.requireActual("next/server");
  return { ...actual, after: () => {} };
});

const BASE = new Date(2026, 10, 1, 12, 0, 0, 0); // 2026-11-01 12:00 local

describe("Leave ledger hardening — balance integrity, collisions, year anchoring", () => {
  const suffix = Math.random().toString(36).slice(2, 10);
  const inst1 = `inst_lvh_1_${suffix}`;
  const inst2 = `inst_lvh_2_${suffix}`;
  // One leave type per creation test so pending-day state never leaks between them.
  const ltA = `lt_lvh_a_${suffix}`;
  const ltB = `lt_lvh_b_${suffix}`;
  const ltC = `lt_lvh_c_${suffix}`;
  const ltD = `lt_lvh_d_${suffix}`;
  const ltE = `lt_lvh_e_${suffix}`;
  const ltF = `lt_lvh_f_${suffix}`;
  const ltG = `lt_lvh_g_${suffix}`;
  const employee = `stf_lvh_emp_${suffix}`;
  const adminUser = `stf_lvh_admin_${suffix}`;
  const hodUser = `stf_lvh_hod_${suffix}`;
  const outsider = `stf_lvh_out_${suffix}`;
  const dept1 = `dept_lvh_${suffix}`;
  const YEAR = 2026;

  const setSession = (payload: Record<string, unknown>) =>
    (verifySession as jest.Mock).mockResolvedValue({
      permissions: ["*"],
      ...payload,
    });
  const sessionFor = (staffId: string, role = "staff") => ({
    staffId,
    role,
    institutionId: inst1,
    email: `${staffId}@lvh.test`,
  });

  // The create schema requires daysCount; the route re-derives it from the
  // date range, so tests send the same derived value a client would.
  const leaveBody = (leaveTypeId: string, startDate: string, endDate: string) => {
    const daysCount =
      Math.round(
        (Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) /
          86_400_000
      ) + 1;
    return { leaveTypeId, startDate, endDate, daysCount };
  };

  const postLeave = (body: Record<string, unknown>) =>
    leavesPost(
      new Request("http://localhost/api/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
    ) as Promise<Response>;

  const putLeave = (id: string, body: Record<string, unknown>) =>
    leavePut(
      new Request(`http://localhost/api/leaves/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ id }) }
    ) as Promise<Response>;

  const deleteLeave = (id: string) =>
    leaveDelete(
      new Request(`http://localhost/api/leaves/${id}`, { method: "DELETE" }),
      { params: Promise.resolve({ id }) }
    ) as Promise<Response>;

  const getLeave = (id: string) =>
    leaveGet(new Request(`http://localhost/api/leaves/${id}`), {
      params: Promise.resolve({ id }),
    }) as Promise<Response>;

  const balanceRow = (leaveTypeId: string, year: number) =>
    db
      .select()
      .from(leaveBalances)
      .where(
        and(
          eq(leaveBalances.staffId, employee),
          eq(leaveBalances.leaveTypeId, leaveTypeId),
          eq(leaveBalances.year, year)
        )
      )
      .get();

  // Balance row ids follow the seedLeaveType pattern: lb_<typeId>_<year>_<suffix>
  const balRowId = (leaveTypeId: string, year: number) =>
    `lb_${leaveTypeId}_${year}_${suffix}`;

  const seedLeave = (values: typeof leaveRequests.$inferInsert) =>
    db.insert(leaveRequests).values(values).returning().get();

  const seedLeaveType = async (id: string) => {
    await db.insert(leaveTypes).values({
      id,
      name: `Leave ${id}`,
      code: id,
      daysAllowed: 15,
    });
    await db.insert(leaveBalances).values([
      { id: `lb_${id}_2026_${suffix}`, staffId: employee, leaveTypeId: id, totalDays: 10, usedDays: 0, year: YEAR },
      { id: `lb_${id}_2027_${suffix}`, staffId: employee, leaveTypeId: id, totalDays: 10, usedDays: 0, year: YEAR + 1 },
    ]);
  };

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
      { id: inst1, name: `LeaveHardening 1 ${suffix}`, code: `lh1${suffix.slice(-5)}` },
      { id: inst2, name: `LeaveHardening 2 ${suffix}`, code: `lh2${suffix.slice(-5)}` },
    ]);
    await db.insert(staff).values([
      { id: employee, email: `emp_${suffix}@lvh.test`, employeeId: `EMP_LVH_E_${suffix.slice(-6)}`, firstName: "Leave", lastName: "Employee", role: "staff", isActive: true, tokenVersion: 0 },
      { id: adminUser, email: `adm_${suffix}@lvh.test`, employeeId: `EMP_LVH_A_${suffix.slice(-6)}`, firstName: "Leave", lastName: "Admin", role: "admin", isActive: true, tokenVersion: 0 },
      { id: hodUser, email: `hod_${suffix}@lvh.test`, employeeId: `EMP_LVH_H_${suffix.slice(-6)}`, firstName: "Leave", lastName: "Hod", role: "hod", isActive: true, tokenVersion: 0 },
      { id: outsider, email: `out_${suffix}@lvh.test`, employeeId: `EMP_LVH_O_${suffix.slice(-6)}`, firstName: "Out", lastName: "Sider", role: "staff", isActive: true, tokenVersion: 0 },
    ]);
    await db.insert(staffInstitutions).values([
      { id: `si_lvh_e_${suffix}`, staffId: employee, institutionId: inst1 },
      { id: `si_lvh_a_${suffix}`, staffId: adminUser, institutionId: inst1 },
      { id: `si_lvh_h_${suffix}`, staffId: hodUser, institutionId: inst1 },
      { id: `si_lvh_o1_${suffix}`, staffId: outsider, institutionId: inst1 },
      { id: `si_lvh_o2_${suffix}`, staffId: outsider, institutionId: inst2 },
    ]);
    await db.insert(departments).values([
      { id: dept1, name: `Dept ${suffix}`, code: `D_${suffix.slice(-6)}`, headUserId: hodUser },
    ]);
    await db.insert(staffDepartments).values([
      { id: `sd_lvh_${suffix}`, staffId: employee, departmentId: dept1 },
    ]);
    await Promise.all([ltA, ltB, ltC, ltD, ltE, ltF, ltG].map((t) => seedLeaveType(t)));
  });

  beforeEach(async () => {
    // Reset all balances so approval tests start from a clean ledger.
    await db.update(leaveBalances).set({ usedDays: 0 });
    jest.setSystemTime(BASE);
    (verifySession as jest.Mock).mockReset();
  });

  describe("creation-time guards", () => {
    it("rejects a request that exceeds the remaining balance", async () => {
      setSession(sessionFor(employee));
      const res = await postLeave(leaveBody(ltA, "2026-12-01", "2026-12-11"));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(String(data.error)).toContain("Insufficient leave balance");
    });

    it("reserves pending days so a second request cannot overcommit the balance", async () => {
      setSession(sessionFor(employee));
      const first = await postLeave(leaveBody(ltB, "2027-01-05", "2027-01-09"));
      expect(first.status).toBe(201);

      // 5 more days would fit alone, but 5 are pending-reserved → only 5 left.
      const second = await postLeave(leaveBody(ltB, "2027-01-15", "2027-01-20"));
      expect(second.status).toBe(400);
      const data = await second.json();
      expect(String(data.error)).toContain("Insufficient leave balance");
    });

    it("rejects overlapping dates against an existing pending leave", async () => {
      setSession(sessionFor(employee));
      // 3 days pending → 7 left; the overlap leave needs only 2, so the
      // balance gate passes and the overlap gate fires instead.
      const first = await postLeave(leaveBody(ltC, "2027-02-10", "2027-02-12"));
      expect(first.status).toBe(201);

      const overlap = await postLeave(leaveBody(ltC, "2027-02-11", "2027-02-13"));
      expect(overlap.status).toBe(409);
      const data = await overlap.json();
      expect(String(data.error)).toContain("overlap");
    });

    it("allows back-to-back leaves that merely touch at the boundary", async () => {
      setSession(sessionFor(employee));
      const first = await postLeave(leaveBody(ltD, "2027-03-10", "2027-03-14"));
      expect(first.status).toBe(201);

      const adjacent = await postLeave(leaveBody(ltD, "2027-03-15", "2027-03-16"));
      expect(adjacent.status).toBe(201);
    });

    it("ignores rejected spans: rejected leaves do not block new dates", async () => {
      await seedLeave({
        id: `lvh_rej_${suffix}`,
        staffId: employee,
        leaveTypeId: ltE,
        startDate: "2027-04-20",
        endDate: "2027-04-24",
        daysCount: 5,
        status: "rejected",
        institutionId: inst1,
      });

      setSession(sessionFor(employee));
      const res = await postLeave(leaveBody(ltE, "2027-04-21", "2027-04-22"));
      expect(res.status).toBe(201);
    });

    it("still blocks dates that collide with an approved leave", async () => {
      await seedLeave({
        id: `lvh_app_${suffix}`,
        staffId: employee,
        leaveTypeId: ltF,
        startDate: "2027-05-25",
        endDate: "2027-05-27",
        daysCount: 3,
        status: "approved",
        institutionId: inst1,
      });

      setSession(sessionFor(employee));
      const res = await postLeave(leaveBody(ltF, "2027-05-26", "2027-05-28"));
      expect(res.status).toBe(409);
    });
  });

  describe("approval capacity guard", () => {
    it("rejects an under-funded approval and rolls back the status transition", async () => {
      // Balance: 10 total, 9 already used — only 1 day remains.
      await db
        .update(leaveBalances)
        .set({ usedDays: 9 })
        .where(eq(leaveBalances.id, balRowId(ltB, 2027)))
        .run();

      const seeded = await seedLeave({
        id: `lvh_underfunded_${suffix}`,
        staffId: employee,
        leaveTypeId: ltB,
        startDate: "2027-06-01",
        endDate: "2027-06-02",
        daysCount: 2,
        status: "pending",
        institutionId: inst1,
      });

      setSession(sessionFor(adminUser, "admin"));
      const res = await putLeave(seeded.id, { status: "approved" });
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(String(data.error)).toContain("Insufficient leave balance");

      // Atomic rollback: the leave is STILL pending and the balance untouched.
      const row = await getLeave(seeded.id);
      expect(row.status).toBe(200);
      const { leave } = await row.json();
      expect(leave.status).toBe("pending");
      const balance = await balanceRow(ltB, 2027);
      expect(balance?.usedDays).toBe(9);
    });

    it("serializes concurrent approvals so usedDays never exceeds totalDays", async () => {
      // Balance: 10 total, 9 used — exactly one 1-day leave can be funded.
      await db
        .update(leaveBalances)
        .set({ usedDays: 9 })
        .where(eq(leaveBalances.id, balRowId(ltB, 2027)))
        .run();

      const a = await seedLeave({
        id: `lvh_race_a_${suffix}`,
        staffId: employee,
        leaveTypeId: ltB,
        startDate: "2027-07-01",
        endDate: "2027-07-01",
        daysCount: 1,
        status: "pending",
        institutionId: inst1,
      });
      const b = await seedLeave({
        id: `lvh_race_b_${suffix}`,
        staffId: employee,
        leaveTypeId: ltB,
        startDate: "2027-07-02",
        endDate: "2027-07-02",
        daysCount: 1,
        status: "pending",
        institutionId: inst1,
      });

      setSession(sessionFor(adminUser, "admin"));
      const [ra, rb] = await Promise.all([
        putLeave(a.id, { status: "approved" }),
        putLeave(b.id, { status: "approved" }),
      ]);
      const statuses = [ra.status, rb.status].sort((x, y) => x - y);
      expect(statuses).toEqual([200, 409]);

      const balance = await balanceRow(ltB, 2027);
      expect(balance?.usedDays).toBe(10); // never past totalDays
    });

    it("deducts on final approval only (HOD stage moves status without touching the balance)", async () => {
      const seeded = await seedLeave({
        id: `lvh_twostage_${suffix}`,
        staffId: employee,
        leaveTypeId: ltB,
        startDate: "2027-08-03",
        endDate: "2027-08-04",
        daysCount: 2,
        status: "pending",
        institutionId: inst1,
      });

      setSession(sessionFor(hodUser, "hod"));
      const hodRes = await putLeave(seeded.id, { status: "approved" });
      expect(hodRes.status).toBe(200);
      let { leave } = await hodRes.json();
      expect(leave.status).toBe("hod_approved");
      let balance = await balanceRow(ltB, 2027);
      expect(balance?.usedDays).toBe(0); // not deducted at HOD stage

      setSession(sessionFor(adminUser, "admin"));
      const adminRes = await putLeave(seeded.id, { status: "approved" });
      expect(adminRes.status).toBe(200);
      ({ leave } = await adminRes.json());
      expect(leave.status).toBe("approved");
      balance = await balanceRow(ltB, 2027);
      expect(balance?.usedDays).toBe(2); // deducted once, on final approval
    });
  });

  describe("calendar-year anchoring", () => {
    it("deducts from the leave-year balance even when approved in the next calendar year", async () => {
      // Leave starts 2026-12-28; approval happens 2027-01-02.
      jest.setSystemTime(new Date(2027, 0, 2, 10, 0, 0));

      setSession(sessionFor(employee));
      const created = await postLeave(leaveBody(ltG, "2026-12-28", "2026-12-30"));
      expect(created.status).toBe(201);
      const { leave } = await created.json();

      setSession(sessionFor(adminUser, "admin"));
      const res = await putLeave(leave.id, { status: "approved" });
      expect(res.status).toBe(200);

      const row2026 = await balanceRow(ltG, 2026);
      const row2027 = await balanceRow(ltG, 2027);
      expect(row2026?.usedDays).toBe(3);
      expect(row2027?.usedDays).toBe(0);
    });
  });

  describe("delete credits", () => {
    it("returns days to the balance when an approved leave is deleted", async () => {
      const created = await seedLeave({
        id: `lvh_del_app_${suffix}`,
        staffId: employee,
        leaveTypeId: ltA,
        startDate: "2027-09-07",
        endDate: "2027-09-09",
        daysCount: 3,
        status: "approved",
        institutionId: inst1,
      });
      await db
        .update(leaveBalances)
        .set({ usedDays: 3 })
        .where(eq(leaveBalances.id, balRowId(ltA, 2027)))
        .run();

      setSession(sessionFor(employee));
      const res = await deleteLeave(created.id);
      expect(res.status).toBe(200);

      const balance = await balanceRow(ltA, 2027);
      expect(balance?.usedDays).toBe(0);

      const gone = await getLeave(created.id);
      expect(gone.status).toBe(404);
    });

    it("deletes a pending leave without touching the balance", async () => {
      const created = await seedLeave({
        id: `lvh_del_pen_${suffix}`,
        staffId: employee,
        leaveTypeId: ltA,
        startDate: "2027-10-05",
        endDate: "2027-10-06",
        daysCount: 2,
        status: "pending",
        institutionId: inst1,
      });

      setSession(sessionFor(employee));
      const res = await deleteLeave(created.id);
      expect(res.status).toBe(200);

      const balance = await balanceRow(ltA, 2027);
      expect(balance?.usedDays).toBe(0);
    });

    it("forbids deleting another employee's leave", async () => {
      const seeded = await seedLeave({
        id: `lvh_del_other_${suffix}`,
        staffId: employee,
        leaveTypeId: ltA,
        startDate: "2027-11-02",
        endDate: "2027-11-03",
        daysCount: 2,
        status: "pending",
        institutionId: inst1,
      });

      setSession(sessionFor(outsider));
      const res = await deleteLeave(seeded.id);
      expect(res.status).toBe(403);
    });
  });

  describe("list scoping", () => {
    it("scopes the list endpoint to the caller's own leave requests", async () => {
      setSession(sessionFor(outsider));
      const res = (await leavesGet(
        new Request("http://localhost/api/leaves")
      )) as Response;
      expect(res.status).toBe(200);
      const data = await res.json();
      const ids: string[] = data.leaves.map((l: { id: string }) => l.id);
      expect(ids).not.toContain(`lvh_del_app_${suffix}`);
    });
  });
});
