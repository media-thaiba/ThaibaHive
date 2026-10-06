import { db } from "@/db";
import { mealNotifications, staff, staffInstitutions, institutions } from "@/db/schema";
import { GET as getMeals } from "../route";
import { eq, inArray } from "drizzle-orm";

jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: jest.fn(),
    hasPermission: jest.fn().mockReturnValue(true),
  };
});

describe("Canteen Multi-Institution Scoped Retrieval (R8-3)", () => {
  const ts = Date.now();
  const instA = `inst-multi-a-${ts}`;
  const instB = `inst-multi-b-${ts}`;
  const instC = `inst-multi-c-${ts}`;

  const multiStaffId = `staff-multi-ab-${ts}`;
  const singleStaffId = `staff-single-a-${ts}`;
  const otherStaffId = `staff-other-c-${ts}`;

  const testDate = "2026-11-20";
  const mealA = `meal-multi-a-${ts}`;
  const mealB = `meal-multi-b-${ts}`;
  const mealC = `meal-multi-c-${ts}`;

  beforeAll(async () => {
    // Seed 3 institutions
    await db.insert(institutions).values([
      { id: instA, name: "Multi Inst A", code: `MIA_${ts}` },
      { id: instB, name: "Multi Inst B", code: `MIB_${ts}` },
      { id: instC, name: "Multi Inst C", code: `MIC_${ts}` },
    ]).run();

    // Seed staff
    await db.insert(staff).values([
      { id: multiStaffId, email: `multistaff_${ts}@test.local`, employeeId: `EMP_M_${ts}`, firstName: "Multi", lastName: "Staff", role: "staff" },
      { id: singleStaffId, email: `singlestaff_${ts}@test.local`, employeeId: `EMP_S_${ts}`, firstName: "Single", lastName: "Staff", role: "staff" },
      { id: otherStaffId, email: `otherstaff_${ts}@test.local`, employeeId: `EMP_O_${ts}`, firstName: "Other", lastName: "Staff", role: "staff" },
    ]).run();

    // Link staff to institutions
    await db.insert(staffInstitutions).values([
      { id: `si-m-a-${ts}`, staffId: multiStaffId, institutionId: instA },
      { id: `si-m-b-${ts}`, staffId: multiStaffId, institutionId: instB },
      { id: `si-s-a-${ts}`, staffId: singleStaffId, institutionId: instA },
      { id: `si-o-c-${ts}`, staffId: otherStaffId, institutionId: instC },
    ]).run();

    // Seed meal notifications across institutions
    await db.insert(mealNotifications).values([
      { id: mealA, staffId: singleStaffId, date: testDate, mealType: "breakfast", status: "skip", institutionId: instA },
      { id: mealB, staffId: multiStaffId, date: testDate, mealType: "lunch", status: "bring_guest", guestCount: 1, institutionId: instB },
      { id: mealC, staffId: otherStaffId, date: testDate, mealType: "dinner", status: "skip", institutionId: instC },
    ]).run();
  });

  afterAll(async () => {
    await db.delete(mealNotifications).where(inArray(mealNotifications.id, [mealA, mealB, mealC])).run();
    await db.delete(staffInstitutions).where(inArray(staffInstitutions.staffId, [multiStaffId, singleStaffId, otherStaffId])).run();
    await db.delete(staff).where(inArray(staff.id, [multiStaffId, singleStaffId, otherStaffId])).run();
    await db.delete(institutions).where(inArray(institutions.id, [instA, instB, instC])).run();
  });

  it("returns notifications across both Institution A and Institution B when multi-school staff queries without specific institutionId", async () => {
    const { verifySession } = require("@thaiba/auth");
    verifySession.mockResolvedValue({
      staffId: multiStaffId,
      role: "staff",
      institutionId: instA,
    });

    const req = new Request(`http://localhost/api/canteen?date=${testDate}`, { method: "GET" });
    const res = await getMeals(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    const ids = json.notifications.map((n: any) => n.id);
    expect(ids).toContain(mealA);
    expect(ids).toContain(mealB);
    expect(ids).not.toContain(mealC);
  });

  it("filters to only Institution A when multi-school staff requests ?institutionId=instA", async () => {
    const { verifySession } = require("@thaiba/auth");
    verifySession.mockResolvedValue({
      staffId: multiStaffId,
      role: "staff",
      institutionId: instA,
    });

    const req = new Request(`http://localhost/api/canteen?date=${testDate}&institutionId=${instA}`, { method: "GET" });
    const res = await getMeals(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    const ids = json.notifications.map((n: any) => n.id);
    expect(ids).toContain(mealA);
    expect(ids).not.toContain(mealB);
    expect(ids).not.toContain(mealC);
  });

  it("returns 403 Forbidden when multi-school staff requests unauthorized ?institutionId=instC", async () => {
    const { verifySession } = require("@thaiba/auth");
    verifySession.mockResolvedValue({
      staffId: multiStaffId,
      role: "staff",
      institutionId: instA,
    });

    const req = new Request(`http://localhost/api/canteen?date=${testDate}&institutionId=${instC}`, { method: "GET" });
    const res = await getMeals(req);
    expect(res.status).toBe(403);

    const json = await res.json();
    expect(json.error).toContain("Forbidden");
  });
});
