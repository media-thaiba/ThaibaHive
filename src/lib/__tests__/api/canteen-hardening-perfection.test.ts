/**
 * @jest-environment node
 *
 * Canteen & Meal Management Pipeline — Hardening & Integrity Suite:
 * - Safe JSON parsing: Malformed/empty payloads return 400 across all 4 mutating endpoints
 * - Schema bounds validation: Item quantity (1..50), unit price (0.01..10000), pass balance (0..100000)
 * - Pass code collision guards: Duplicate pass code returns 409 Conflict
 * - Idempotency & replay protection: Replayed idempotency key returns cached transaction response
 * - Concurrency & overdraft prevention: Simultaneous redemptions cannot double-spend or overdraft
 */

import {
  db,
  institutions,
  staff,
  staffInstitutions,
  canteenMealPasses,
  canteenMenus,
  canteenItems,
  canteenTransactions,
  mealNotifications,
} from "@/db";
import { verifySession, hasPermission } from "@thaiba/auth";
import { eq, inArray } from "drizzle-orm";
import {
  GET as listMealNotifications,
  POST as createMealNotification,
} from "@/app/api/canteen/route";
import {
  GET as getMenu,
  POST as publishMenuOrItem,
} from "@/app/api/canteen/menu/route";
import {
  GET as listPasses,
  POST as createPass,
} from "@/app/api/canteen/passes/route";
import { POST as redeemMeal } from "@/app/api/canteen/redeem/route";
import { DELETE as deleteMealNotification } from "@/app/api/canteen/[id]/route";
import { GET as exportCanteen } from "@/app/api/export/canteen/route";
import {
  GET as getParentCanteenBalance,
  POST as updateParentDietaryFlags,
} from "@/app/api/mobile/v1/parent/canteen-balance/route";

jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: jest.fn(),
    hasPermission: jest.fn(),
  };
});

describe("Canteen & Meal Management Pipeline — Hardening", () => {
  const suffix = Math.random().toString(36).slice(2, 10);
  const instA = `inst_cnt_a_${suffix}`;
  const instB = `inst_cnt_b_${suffix}`;

  const adminAId = `stf_adm_cnt_a_${suffix}`;
  const cashierAId = `stf_csh_cnt_a_${suffix}`;
  const studentAId = `stf_stu_cnt_a_${suffix}`;

  const passCode1 = `PASS_${suffix}_1`;
  const passCode2 = `PASS_${suffix}_2`;

  function asUser(role: string, staffId: string, instId: string) {
    (verifySession as unknown as jest.Mock).mockResolvedValue({
      userId: `usr_${staffId}`,
      staffId,
      role,
      institutionId: instId,
    });
    (hasPermission as unknown as jest.Mock).mockImplementation((_session: unknown, perm: string) => {
      if (role === "super_admin" || role === "admin") return true;
      if (role === "staff" && (perm === "canteen:read" || perm === "canteen:create" || perm === "canteen:redeem" || perm === "canteen:delete" || perm === "canteen:manage")) {
        return true;
      }
      return false;
    });
  }

  beforeAll(async () => {
    // 1. Create Institutions
    await db.insert(institutions).values([
      { id: instA, name: `Institution A ${suffix}`, code: `ICA_${suffix}` },
      { id: instB, name: `Institution B ${suffix}`, code: `ICB_${suffix}` },
    ]);

    // 2. Create Staff Fixtures
    await db.insert(staff).values([
      { id: adminAId, email: `admin_cnt_a_${suffix}@test.local`, employeeId: `EMP_CNT_A_${suffix}`, firstName: "Admin", lastName: "A", role: "admin" },
      { id: cashierAId, email: `cashier_cnt_a_${suffix}@test.local`, employeeId: `EMP_CNT_C_${suffix}`, firstName: "Cashier", lastName: "A", role: "staff" },
      { id: studentAId, email: `student_cnt_a_${suffix}@test.local`, employeeId: `EMP_CNT_S_${suffix}`, firstName: "Student", lastName: "A", role: "staff" },
    ]);

    // 3. Staff Institutions Affiliation
    await db.insert(staffInstitutions).values([
      { id: `si_adm_cnt_a_${suffix}`, staffId: adminAId, institutionId: instA },
      { id: `si_csh_cnt_a_${suffix}`, staffId: cashierAId, institutionId: instA },
      { id: `si_stu_cnt_a_${suffix}`, staffId: studentAId, institutionId: instA },
    ]);

    // 4. Publish active menus for today
    const today = new Date().toISOString().split("T")[0];
    await db.insert(canteenMenus).values([
      {
        id: `menu_brk_${suffix}`,
        institutionId: instA,
        date: today,
        mealType: "breakfast",
        itemsJson: JSON.stringify([{ itemId: "item_tea", name: "Tea", price: 10 }]),
        isActive: true,
      },
      {
        id: `menu_lun_${suffix}`,
        institutionId: instA,
        date: today,
        mealType: "lunch",
        itemsJson: JSON.stringify([{ itemId: "item_thali", name: "Thali", price: 60 }]),
        isActive: true,
      },
      {
        id: `menu_snk_${suffix}`,
        institutionId: instA,
        date: today,
        mealType: "snacks",
        itemsJson: JSON.stringify([{ itemId: "item_samosa", name: "Samosa", price: 15 }]),
        isActive: true,
      },
    ]);
  });

  afterAll(async () => {
    const testStaffIds = [adminAId, cashierAId, studentAId];
    // Teardown in strict FK dependency order
    await db.delete(canteenTransactions).where(inArray(canteenTransactions.institutionId, [instA, instB])).run();
    await db.delete(canteenMealPasses).where(inArray(canteenMealPasses.institutionId, [instA, instB])).run();
    await db.delete(canteenMenus).where(inArray(canteenMenus.institutionId, [instA, instB])).run();
    await db.delete(canteenItems).where(inArray(canteenItems.institutionId, [instA, instB])).run();
    await db.delete(mealNotifications).where(inArray(mealNotifications.institutionId, [instA, instB])).run();
    await db.delete(staffInstitutions).where(inArray(staffInstitutions.staffId, testStaffIds)).run();
    await db.delete(staff).where(inArray(staff.id, testStaffIds)).run();
    await db.delete(institutions).where(inArray(institutions.id, [instA, instB])).run();
  });

  describe("1. Safe JSON Parsing Across All Mutating Endpoints", () => {
    it("POST /api/canteen returns 400 on malformed JSON", async () => {
      asUser("staff", studentAId, instA);
      const req = new Request("http://localhost/api/canteen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "bad json {",
      });
      const res = await createMealNotification(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/Invalid JSON/i);
    });

    it("POST /api/canteen/menu returns 400 on malformed JSON", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/canteen/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{ unclosed json",
      });
      const res = await publishMenuOrItem(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/Invalid JSON/i);
    });

    it("POST /api/canteen/passes returns 400 on malformed JSON", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/canteen/passes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "broken payload [",
      });
      const res = await createPass(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/Invalid JSON/i);
    });

    it("POST /api/canteen/redeem returns 400 on malformed JSON", async () => {
      asUser("staff", cashierAId, instA);
      const req = new Request("http://localhost/api/canteen/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "malformed {",
      });
      const res = await redeemMeal(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/Invalid JSON/i);
    });
  });

  describe("2. Schema Bounds & Input Validation", () => {
    it("rejects zero or negative redemption quantity with 400", async () => {
      asUser("staff", cashierAId, instA);
      const req = new Request("http://localhost/api/canteen/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passCode: passCode1,
          items: [{ itemId: "item_thali", quantity: 0, unitPrice: 60 }],
        }),
      });
      const res = await redeemMeal(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/Invalid redemption payload/i);
    });

    it("rejects redemption quantity exceeding 50 with 400", async () => {
      asUser("staff", cashierAId, instA);
      const req = new Request("http://localhost/api/canteen/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passCode: passCode1,
          items: [{ itemId: "item_thali", quantity: 51, unitPrice: 60 }],
        }),
      });
      const res = await redeemMeal(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/Invalid redemption payload/i);
    });

    it("rejects non-positive unitPrice with 400", async () => {
      asUser("staff", cashierAId, instA);
      const req = new Request("http://localhost/api/canteen/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passCode: passCode1,
          items: [{ itemId: "item_thali", quantity: 1, unitPrice: 0 }],
        }),
      });
      const res = await redeemMeal(req);
      expect(res.status).toBe(400);
    });

    it("rejects empty items array with 400", async () => {
      asUser("staff", cashierAId, instA);
      const req = new Request("http://localhost/api/canteen/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passCode: passCode1,
          items: [],
        }),
      });
      const res = await redeemMeal(req);
      expect(res.status).toBe(400);
    });
  });

  describe("3. Pass Management & Collision Guards", () => {
    it("creates a meal pass with initial balance", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/canteen/passes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: studentAId,
          passCode: passCode1,
          balance: 100,
          dailyLimit: 200,
          institutionId: instA,
        }),
      });
      const res = await createPass(req);
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.pass.passCode).toBe(passCode1);
      expect(body.pass.balance).toBe(100);
      expect(body.pass.dailyLimit).toBe(200);
    });

    it("rejects duplicate passCode with 409 Conflict", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/canteen/passes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: studentAId,
          passCode: passCode1, // already taken
          balance: 50,
          institutionId: instA,
        }),
      });
      const res = await createPass(req);
      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.error).toMatch(/already exists/i);
    });
  });

  describe("4. Redemption Idempotency & Overdraft Concurrency", () => {
    const idemKey = `idem_${suffix}_key1`;

    it("successfully redeems and deducts pass balance", async () => {
      asUser("staff", cashierAId, instA);
      const req = new Request("http://localhost/api/canteen/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passCode: passCode1,
          items: [{ itemId: "item_thali", quantity: 1, unitPrice: 30 }],
          idempotencyKey: idemKey,
        }),
      });
      const res = await redeemMeal(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.deductedAmount).toBe(30);
      expect(body.remainingBalance).toBe(70);
    });

    it("replaying identical idempotencyKey returns cached response without second debit", async () => {
      asUser("staff", cashierAId, instA);
      const req = new Request("http://localhost/api/canteen/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passCode: passCode1,
          items: [{ itemId: "item_thali", quantity: 1, unitPrice: 30 }],
          idempotencyKey: idemKey, // same key
        }),
      });
      const res = await redeemMeal(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("already_processed");
      expect(body.deductedAmount).toBe(30);

      // Verify pass balance is still 70 (not 40!)
      const passRow = await db
        .select()
        .from(canteenMealPasses)
        .where(eq(canteenMealPasses.passCode, passCode1))
        .get();
      expect(passRow?.balance).toBe(70);
    });

    it("blocks simultaneous redemptions from overdrafting remaining balance", async () => {
      asUser("staff", cashierAId, instA);

      // Remaining balance is 70. Fire two simultaneous redemptions of 50 each.
      // Total 100 > 70. Exactly one MUST succeed, one MUST fail with 400.
      const p1 = redeemMeal(
        new Request("http://localhost/api/canteen/redeem", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            passCode: passCode1,
            items: [{ itemId: "item_thali", quantity: 1, unitPrice: 50 }],
            idempotencyKey: `race_${suffix}_1`,
          }),
        })
      );
      const p2 = redeemMeal(
        new Request("http://localhost/api/canteen/redeem", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            passCode: passCode1,
            items: [{ itemId: "item_thali", quantity: 1, unitPrice: 50 }],
            idempotencyKey: `race_${suffix}_2`,
          }),
        })
      );

      const [res1, res2] = await Promise.all([p1, p2]);
      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([200, 400]);

      // Check pass balance is 20 (70 - 50 = 20) and NEVER negative
      const passRow = await db
        .select()
        .from(canteenMealPasses)
        .where(eq(canteenMealPasses.passCode, passCode1))
        .get();
      expect(passRow?.balance).toBe(20);
    });
  });

  describe("Canteen Sales Export Multi-Tenant Scoping", () => {
    const txAId = `tx_exp_a_${suffix}`;
    const txBId = `tx_exp_b_${suffix}`;
    const passExpAId = `pass_exp_a_${suffix}`;
    const passExpBId = `pass_exp_b_${suffix}`;

    beforeAll(async () => {
      // Seed passes and transactions in Campus A and Campus B
      await db.insert(canteenMealPasses).values([
        {
          id: passExpAId,
          institutionId: instA,
          userId: studentAId,
          passCode: `EXP_A_${suffix}`,
          balance: 500,
          status: "active",
        },
        {
          id: passExpBId,
          institutionId: instB,
          userId: studentAId,
          passCode: `EXP_B_${suffix}`,
          balance: 500,
          status: "active",
        },
      ]);

      await db.insert(canteenTransactions).values([
        {
          id: txAId,
          institutionId: instA,
          passId: passExpAId,
          passCode: `EXP_A_${suffix}`,
          userId: studentAId,
          itemsJson: "[]",
          totalAmount: 150,
          status: "completed",
        },
        {
          id: txBId,
          institutionId: instB,
          passId: passExpBId,
          passCode: `EXP_B_${suffix}`,
          userId: studentAId,
          itemsJson: "[]",
          totalAmount: 250,
          status: "completed",
        },
      ]);
    });

    afterAll(async () => {
      await db.delete(canteenTransactions).where(inArray(canteenTransactions.id, [txAId, txBId]));
      await db.delete(canteenMealPasses).where(inArray(canteenMealPasses.id, [passExpAId, passExpBId]));
    });

    it("restricts export to tenant-scoped transactions (Campus A cannot export Campus B)", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request(`http://localhost/api/export/canteen?format=csv&institutionId=${instA}`);
      const res = await exportCanteen(req);
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toContain(`EXP_A_${suffix}`);
      expect(text).not.toContain(`EXP_B_${suffix}`);
    });

    it("allows super_admin to export global canteen ledger across all institutions", async () => {
      asUser("super_admin", "super_admin_id", instA);
      const req = new Request("http://localhost/api/export/canteen?format=csv");
      const res = await exportCanteen(req);
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toContain(`EXP_A_${suffix}`);
      expect(text).toContain(`EXP_B_${suffix}`);
    });
  });

  describe("Mobile Parent Canteen Balance & Dietary Hardening", () => {
    it("safely handles empty or malformed JSON body on dietary update with 400 (not 500)", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/mobile/v1/parent/canteen-balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid-json",
      });
      const res = await updateParentDietaryFlags(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("Invalid JSON payload");
    });

    it("rejects dietary update with missing parameters (400)", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/mobile/v1/parent/canteen-balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: studentAId,
          // missing dietaryFlags
        }),
      });
      const res = await updateParentDietaryFlags(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("Missing required dietary parameters");
    });

    it("successfully updates dietary flags with valid payload (200)", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/mobile/v1/parent/canteen-balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: studentAId,
          dietaryFlags: "Nut-free, Halal",
        }),
      });
      const res = await updateParentDietaryFlags(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.dietaryFlags).toBe("Nut-free, Halal");
    });
  });

  describe("Dynamic Parameter Fallback on Canteen Deletion", () => {
    const mealNotifId = `meal_notif_del_${suffix}`;

    beforeAll(async () => {
      await db.insert(mealNotifications).values({
        id: mealNotifId,
        staffId: studentAId,
        date: "2028-12-01",
        mealType: "lunch",
        status: "eating",
        institutionId: instA,
      });
    });

    it("returns 404 on deleting non-existent meal notification", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/canteen/non-existent-id", {
        method: "DELETE",
      });
      const res = await deleteMealNotification(req, { params: Promise.resolve({ id: "non-existent-id" }) });
      expect(res.status).toBe(404);
    });

    it("successfully deletes meal notification with params object", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request(`http://localhost/api/canteen/${mealNotifId}`, {
        method: "DELETE",
      });
      const res = await deleteMealNotification(req, { params: Promise.resolve({ id: mealNotifId }) });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });
  });
});
