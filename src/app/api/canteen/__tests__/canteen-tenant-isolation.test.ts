import { db } from "@/db";
import { mealNotifications, staff, staffInstitutions, institutions } from "@/db/schema";
import { DELETE as deleteMeal } from "../[id]/route";
import { POST as postMeal } from "../route";
import { eq } from "drizzle-orm";

jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: jest.fn(),
    hasPermission: jest.fn().mockReturnValue(true),
  };
});

describe("Canteen Meal Notification Tenant Isolation", () => {
  const ts = Date.now();
  const instA = `inst-canteen-a-${ts}`;
  const instB = `inst-canteen-b-${ts}`;
  const staffA = `staff-canteen-a-${ts}`;
  const staffB = `staff-canteen-b-${ts}`;
  const mealA = `meal-a-${ts}`;

  beforeAll(async () => {
    // Seed institutions
    await db.insert(institutions).values([
      { id: instA, name: "Canteen Inst Alpha", code: `CIA_${ts}` },
      { id: instB, name: "Canteen Inst Beta", code: `CIB_${ts}` },
    ]).run();

    // Seed staff
    await db.insert(staff).values([
      { id: staffA, email: `staffCa_${ts}@test.local`, employeeId: `EMP_CA_${ts}`, firstName: "AlphaCanteen", lastName: "Staff", role: "staff" },
      { id: staffB, email: `staffCb_${ts}@test.local`, employeeId: `EMP_CB_${ts}`, firstName: "BetaCanteen", lastName: "Staff", role: "staff" },
    ]).run();

    // Link staff to institutions
    await db.insert(staffInstitutions).values([
      { id: `si-ca-${ts}`, staffId: staffA, institutionId: instA },
      { id: `si-cb-${ts}`, staffId: staffB, institutionId: instB },
    ]).run();

    // Seed meal notification in instA
    await db.insert(mealNotifications).values({
      id: mealA,
      staffId: staffA,
      date: "2026-11-05",
      mealType: "lunch",
      status: "skip",
      institutionId: instA,
    }).run();
  });

  afterAll(async () => {
    await db.delete(mealNotifications).where(eq(mealNotifications.id, mealA)).run();
    await db.delete(staffInstitutions).where(eq(staffInstitutions.staffId, staffA)).run();
    await db.delete(staffInstitutions).where(eq(staffInstitutions.staffId, staffB)).run();
    await db.delete(staff).where(eq(staff.id, staffA)).run();
    await db.delete(staff).where(eq(staff.id, staffB)).run();
    await db.delete(institutions).where(eq(institutions.id, instA)).run();
    await db.delete(institutions).where(eq(institutions.id, instB)).run();
  });

  it("returns 404 when staff from Institution Beta attempts to DELETE meal notification from Institution Alpha", async () => {
    const { verifySession } = require("@thaiba/auth");
    verifySession.mockResolvedValueOnce({
      staffId: staffB,
      role: "staff",
      institutionId: instB,
    });

    const req = new Request(`http://localhost/api/canteen/${mealA}`, { method: "DELETE" });
    const res = await deleteMeal(req, { params: Promise.resolve({ id: mealA }) });
    expect(res.status).toBe(404);

    // Verify row still exists in database
    const meal = await db.select().from(mealNotifications).where(eq(mealNotifications.id, mealA)).get();
    expect(meal).toBeDefined();
    expect(meal?.id).toBe(mealA);
  });

  it("populates institutionId correctly on POST meal notification", async () => {
    const { verifySession } = require("@thaiba/auth");
    verifySession.mockResolvedValueOnce({
      staffId: staffA,
      role: "staff",
      institutionId: instA,
    });

    const testDate = "2026-11-06";
    const req = new Request("http://localhost/api/canteen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: testDate,
        mealType: "dinner",
        status: "bring_guest",
        guestCount: 2,
        notes: "Visiting guest",
      }),
    });

    const res = await postMeal(req);
    expect(res.status).toBe(200);

    const created = await db
      .select()
      .from(mealNotifications)
      .where(eq(mealNotifications.staffId, staffA))
      .all();
    const dinnerRow = created.find((c) => c.date === testDate && c.mealType === "dinner");
    expect(dinnerRow).toBeDefined();
    expect(dinnerRow?.institutionId).toBe(instA);

    // Cleanup
    if (dinnerRow) {
      await db.delete(mealNotifications).where(eq(mealNotifications.id, dinnerRow.id)).run();
    }
  });
});
