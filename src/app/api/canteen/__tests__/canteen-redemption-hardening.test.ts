/**
 * @jest-environment node
 *
 * Canteen & Meal Flows perfection pass — redemption integrity suite:
 * - Concurrent/sequential balance guard (no overdraft, ledger equation holds)
 * - Idempotency replay + cross-tenant idempotency probing (409, atomic rollback)
 * - Tenant isolation on redeem, transactions, passes, menu, mobile balance
 * - dailyLimit enforcement, meal-window (serving hours + active menu) enforcement
 * - Duplicate menu upsert + duplicate pass-code 409 (explicit errors, no 500s)
 */
import { db, institutions, staff, staffInstitutions, canteenMealPasses, canteenTransactions, canteenMenus } from "@/db";
import { verifySession } from "@thaiba/auth";
import { eq, inArray } from "drizzle-orm";
import { POST as redeemPost } from "@/app/api/canteen/redeem/route";
import { GET as transactionsGet } from "@/app/api/canteen/transactions/route";
import { GET as passesGet, POST as passesPost } from "@/app/api/canteen/passes/route";
import { POST as menuPost } from "@/app/api/canteen/menu/route";
import { GET as balanceGet } from "@/app/api/mobile/v1/parent/canteen-balance/route";

jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: jest.fn(),
    hasPermission: jest.fn().mockReturnValue(true),
  };
});

const FAKE_NOW_HOUR = 13;
const atHour = (h: number, m = 0): Date => {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
};

describe("Canteen redemption hardening — concurrency, idempotency, tenant scope, meal window", () => {
  const suffix = Math.random().toString(36).slice(2, 10);
  const instA = `inst_cnh_a_${suffix}`;
  const instB = `inst_cnh_b_${suffix}`;
  const instW = `inst_cnh_w_${suffix}`;
  const cashierA = `stf_cnh_cash_${suffix}`;
  const betaStaff = `stf_cnh_beta_${suffix}`;
  const principalA = `stf_cnh_prin_${suffix}`;
  const windowStaff = `stf_cnh_win_${suffix}`;
  const ownerA = `usr_cnh_owna_${suffix}`;
  const ownerB = `usr_cnh_ownb_${suffix}`;
  const ownerW = `usr_cnh_ownw_${suffix}`;
  const codeA = `CMP-CA-${suffix}`;
  const codeB = `CMP-CB-${suffix}`;
  const codeSuspended = `CMP-CS-${suffix}`;
  const codeLimit = `CMP-CL-${suffix}`;
  const codeSelfA = `CMP-CE-${suffix}`;
  const codeW = `CMP-CW-${suffix}`;
  const txOwnerAId = `tx_cnh_owna_${suffix}`;
  const txOwnerBId = `tx_cnh_ownb_${suffix}`;
  const seedKeyA = `seedkey_a_${suffix}`;
  const seedKeyB = `seedkey_b_${suffix}`;

  const setSession = (payload: Record<string, unknown>) =>
    (verifySession as jest.Mock).mockResolvedValue({ permissions: ["*"], ...payload });

  const sessionA = (over: Record<string, unknown> = {}) => ({
    staffId: cashierA,
    role: "staff",
    institutionId: instA,
    email: `cashier_${suffix}@cnh.test`,
    ...over,
  });

  const sessionWindow = (over: Record<string, unknown> = {}) => ({
    staffId: windowStaff,
    role: "staff",
    institutionId: instW,
    email: `window_${suffix}@cnh.test`,
    ...over,
  });

  const jsonReq = (url: string, body: unknown, method = "POST"): Request =>
    new Request(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: method === "GET" ? undefined : JSON.stringify(body),
    });

  const redeem = (body: Record<string, unknown>) =>
    redeemPost(jsonReq("https://thaiba.edu/api/canteen/redeem", body));

  const todayIso = (): string => new Date().toISOString().split("T")[0];

  const seedPass = async (opts: {
    id: string;
    institutionId: string;
    userId: string;
    passCode: string;
    balance: number;
    status?: string;
    dailyLimit?: number | null;
  }) => {
    await db.insert(canteenMealPasses).values({
      id: opts.id,
      institutionId: opts.institutionId,
      userId: opts.userId,
      passCode: opts.passCode,
      balance: opts.balance,
      currency: "INR",
      status: opts.status ?? "active",
      dailyLimit: opts.dailyLimit ?? null,
    }).run();
  };

  const seedMenus = async (institutionId: string, mealTypes: string[]) => {
    await db.insert(canteenMenus).values(
      mealTypes.map((mealType, i) => ({
        id: `menu_${institutionId}_${mealType}_${suffix}_${i}`,
        institutionId,
        date: todayIso(),
        mealType,
        itemsJson: JSON.stringify([{ itemId: "item_std", price: 50 }]),
        isActive: true,
      }))
    ).run();
  };

  const passRow = (id: string) =>
    db.select().from(canteenMealPasses).where(eq(canteenMealPasses.id, id)).get();

  beforeAll(async () => {
    jest.useFakeTimers({
      now: atHour(FAKE_NOW_HOUR),
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
      { id: instA, name: `CanteenHardening A ${suffix}`, code: `cha${suffix.slice(-4)}` },
      { id: instB, name: `CanteenHardening B ${suffix}`, code: `chb${suffix.slice(-4)}` },
      { id: instW, name: `CanteenHardening W ${suffix}`, code: `chw${suffix.slice(-4)}` },
    ]);
    await db.insert(staff).values([
      { id: cashierA, email: `cashier_${suffix}@cnh.test`, employeeId: `EMP_CNH_C_${suffix.slice(-6)}`, firstName: "Canteen", lastName: "Cashier", role: "staff", isActive: true, tokenVersion: 0 },
      { id: betaStaff, email: `beta_${suffix}@cnh.test`, employeeId: `EMP_CNH_B_${suffix.slice(-6)}`, firstName: "Beta", lastName: "Staff", role: "staff", isActive: true, tokenVersion: 0 },
      { id: principalA, email: `principal_${suffix}@cnh.test`, employeeId: `EMP_CNH_P_${suffix.slice(-6)}`, firstName: "Canteen", lastName: "Principal", role: "principal", isActive: true, tokenVersion: 0 },
      { id: windowStaff, email: `window_${suffix}@cnh.test`, employeeId: `EMP_CNH_W_${suffix.slice(-6)}`, firstName: "Window", lastName: "Staff", role: "staff", isActive: true, tokenVersion: 0 },
    ]);
    await db.insert(staffInstitutions).values([
      { id: `si_cnh_a_${suffix}`, staffId: cashierA, institutionId: instA },
      { id: `si_cnh_b_${suffix}`, staffId: betaStaff, institutionId: instB },
      { id: `si_cnh_p_${suffix}`, staffId: principalA, institutionId: instA },
      { id: `si_cnh_w_${suffix}`, staffId: windowStaff, institutionId: instW },
    ]);

    await seedPass({ id: `pass_cnh_a_${suffix}`, institutionId: instA, userId: ownerA, passCode: codeA, balance: 100 });
    await seedPass({ id: `pass_cnh_b_${suffix}`, institutionId: instB, userId: ownerB, passCode: codeB, balance: 100 });
    await seedPass({ id: `pass_cnh_sus_${suffix}`, institutionId: instA, userId: ownerA, passCode: codeSuspended, balance: 50, status: "suspended" });
    await seedPass({ id: `pass_cnh_lim_${suffix}`, institutionId: instA, userId: ownerA, passCode: codeLimit, balance: 100, dailyLimit: 50 });
    await seedPass({ id: `pass_cnh_self_${suffix}`, institutionId: instA, userId: cashierA, passCode: codeSelfA, balance: 40 });
    await seedPass({ id: `pass_cnh_w_${suffix}`, institutionId: instW, userId: ownerW, passCode: codeW, balance: 100 });

    await db.insert(canteenTransactions).values([
      {
        id: txOwnerAId,
        institutionId: instA,
        passId: `pass_cnh_a_${suffix}`,
        passCode: codeA,
        userId: ownerA,
        itemsJson: JSON.stringify([{ itemId: "seed", quantity: 1, unitPrice: 10 }]),
        totalAmount: 10,
        idempotencyKey: seedKeyA,
        status: "completed",
      },
      {
        id: txOwnerBId,
        institutionId: instB,
        passId: `pass_cnh_b_${suffix}`,
        passCode: codeB,
        userId: ownerB,
        itemsJson: JSON.stringify([{ itemId: "seed", quantity: 1, unitPrice: 20 }]),
        totalAmount: 20,
        idempotencyKey: seedKeyB,
        status: "completed",
      },
    ]);

    // Serving menus: instA serves all meal types; instB serves lunch;
    // instW serves breakfast only.
    await seedMenus(instA, ["breakfast", "lunch", "snacks"]);
    await seedMenus(instB, ["lunch"]);
    await seedMenus(instW, ["breakfast"]);
  });

  afterAll(async () => {
    jest.useRealTimers();
    const passIds = [
      `pass_cnh_a_${suffix}`, `pass_cnh_b_${suffix}`, `pass_cnh_sus_${suffix}`,
      `pass_cnh_lim_${suffix}`, `pass_cnh_self_${suffix}`, `pass_cnh_w_${suffix}`,
      `pass_cnh_race_${suffix}`,
    ];
    try {
      const txs = await db.select().from(canteenTransactions).where(inArray(canteenTransactions.userId, [ownerA, ownerB, ownerW, cashierA, `usr_cnh_race_${suffix}`])).all();
      await db.delete(canteenTransactions).where(inArray(canteenTransactions.id, txs.map((t) => t.id)));
      await db.delete(canteenMenus).where(inArray(canteenMenus.institutionId, [instA, instW]));
      await db.delete(canteenMealPasses).where(inArray(canteenMealPasses.id, passIds));
      await db.delete(staffInstitutions).where(inArray(staffInstitutions.staffId, [cashierA, betaStaff, principalA]));
      await db.delete(staff).where(inArray(staff.id, [cashierA, betaStaff, principalA]));
      await db.delete(institutions).where(inArray(institutions.id, [instA, instB, instW]));
    } catch {
      // best-effort cleanup
    }
  });

  afterEach(() => {
    jest.setSystemTime(atHour(FAKE_NOW_HOUR));
    (verifySession as jest.Mock).mockReset();
    (require("@thaiba/auth").hasPermission as jest.Mock).mockReturnValue(true);
  });

  describe("balance guard & ledger integrity", () => {
    it("rejects the second sequential redemption that exceeds the balance and keeps the ledger equation", async () => {
      setSession(sessionA());
      const okRes = await redeem({
        passCode: codeA,
        items: [{ itemId: "i1", quantity: 1, unitPrice: 60 }],
        idempotencyKey: `k_seq1_${suffix}`,
      });
      expect(okRes.status).toBe(200);
      const okData = await okRes.json();
      expect(okData.success).toBe(true);
      expect(okData.remainingBalance).toBe(40);

      const failRes = await redeem({
        passCode: codeA,
        items: [{ itemId: "i1", quantity: 1, unitPrice: 60 }],
        idempotencyKey: `k_seq2_${suffix}`,
      });
      expect(failRes.status).toBe(400);
      const failData = await failRes.json();
      expect(String(failData.error)).toContain("Insufficient");

      const row = await passRow(`pass_cnh_a_${suffix}`);
      expect(row?.balance).toBe(40);
    });

    it("serializes concurrent redemptions: never overdrafts and balance always equals initial minus successful deductions", async () => {
      const racePassId = `pass_cnh_race_${suffix}`;
      const raceOwner = `usr_cnh_race_${suffix}`;
      const raceCode = `CMP-RACE-${suffix}`;
      await seedPass({ id: racePassId, institutionId: instA, userId: raceOwner, passCode: raceCode, balance: 100 });

      setSession(sessionA());
      const [r1, r2] = await Promise.all([
        redeem({ passCode: raceCode, items: [{ itemId: "i1", quantity: 1, unitPrice: 60 }], idempotencyKey: `k_race1_${suffix}` }),
        redeem({ passCode: raceCode, items: [{ itemId: "i1", quantity: 1, unitPrice: 60 }], idempotencyKey: `k_race2_${suffix}` }),
      ]);

      for (const res of [r1, r2]) {
        expect([200, 400]).toContain(res.status);
      }
      const statuses = [r1.status, r2.status].filter((s) => s === 200);
      expect(statuses.length).toBeGreaterThanOrEqual(1);

      const row = await passRow(racePassId);
      expect(row?.balance).toBeGreaterThanOrEqual(0);
      // Ledger equation: initial − successful deductions === final balance.
      expect(row?.balance).toBe(100 - 60 * statuses.length);
    });
  });

  describe("idempotency", () => {
    it("replays an existing transaction for a repeated idempotency key without deducting twice", async () => {
      setSession(sessionA());
      const first = await redeem({
        passCode: codeA,
        items: [{ itemId: "i1", quantity: 1, unitPrice: 10 }],
        idempotencyKey: `k_idem_${suffix}`,
      });
      expect(first.status).toBe(200);
      const firstData = await first.json();

      const replay = await redeem({
        passCode: codeA,
        items: [{ itemId: "i1", quantity: 1, unitPrice: 10 }],
        idempotencyKey: `k_idem_${suffix}`,
      });
      expect(replay.status).toBe(200);
      const replayData = await replay.json();
      expect(replayData.status).toBe("already_processed");
      expect(replayData.transactionId).toBe(firstData.transactionId);

      const row = await passRow(`pass_cnh_a_${suffix}`);
      // 100 (seed) − 60 (seq test) − 10 (this test) = 30; replay must not deduct again.
      expect(row?.balance).toBe(30);
    });

    it("answers concurrent duplicate-key redemptions with the same transaction id and a single deduction", async () => {
      const idemPassId = `pass_cnh_idem_${suffix}`;
      const idemOwner = `usr_cnh_idem_${suffix}`;
      const idemCode = `CMP-IDEM-${suffix}`;
      await seedPass({ id: idemPassId, institutionId: instA, userId: idemOwner, passCode: idemCode, balance: 80 });

      setSession(sessionA());
      const key = `k_conc_${suffix}`;
      const [a, b] = await Promise.all([
        redeem({ passCode: idemCode, items: [{ itemId: "i1", quantity: 1, unitPrice: 25 }], idempotencyKey: key }),
        redeem({ passCode: idemCode, items: [{ itemId: "i1", quantity: 1, unitPrice: 25 }], idempotencyKey: key }),
      ]);
      expect(a.status).toBe(200);
      expect(b.status).toBe(200);
      const aData = await a.json();
      const bData = await b.json();
      expect(aData.transactionId).toBe(bData.transactionId);

      const row = await passRow(idemPassId);
      expect(row?.balance).toBe(55);
    });

    it("409s a cross-tenant idempotency-key probe and rolls the deduction back atomically", async () => {
      setSession({ staffId: betaStaff, role: "staff", institutionId: instB, email: `beta_${suffix}@cnh.test` });
      const res = await redeem({
        passCode: codeB,
        items: [{ itemId: "i1", quantity: 1, unitPrice: 15 }],
        idempotencyKey: seedKeyA, // key already used by an instA transaction
      });
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(String(data.error)).toContain("Idempotency");

      const row = await passRow(`pass_cnh_b_${suffix}`);
      expect(row?.balance).toBe(100); // deduction rolled back
      const foreign = await db.select().from(canteenTransactions).where(eq(canteenTransactions.id, txOwnerAId)).get();
      expect(foreign?.totalAmount).toBe(10);
    });
  });

  describe("tenant isolation", () => {
    it("returns the identical not-found message for a cross-tenant pass code (no enumeration)", async () => {
      setSession(sessionA());
      const foreign = await redeem({
        passCode: codeB,
        items: [{ itemId: "i1", quantity: 1, unitPrice: 5 }],
        idempotencyKey: `k_xt_${suffix}`,
      });
      expect(foreign.status).toBe(404);
      const foreignData = await foreign.json();

      const unknown = await redeem({
        passCode: `CMP-NOPE-${suffix}`,
        items: [{ itemId: "i1", quantity: 1, unitPrice: 5 }],
        idempotencyKey: `k_unk_${suffix}`,
      });
      expect(unknown.status).toBe(404);
      const unknownData = await unknown.json();
      expect(foreignData.error).toBe(unknownData.error);

      const row = await passRow(`pass_cnh_b_${suffix}`);
      expect(row?.balance).toBe(100);
    });

    it("blocks non-manager staff from querying another user's transactions (403)", async () => {
      setSession(sessionA());
      const res = await transactionsGet(
        new Request(`https://thaiba.edu/api/canteen/transactions?userId=${ownerB}`, { method: "GET" })
      );
      expect(res.status).toBe(403);
    });

    it("scopes a manager's cross-user transaction query to their own institutions", async () => {
      setSession(sessionA({ staffId: principalA, role: "principal", email: `principal_${suffix}@cnh.test` }));
      const foreignRes = await transactionsGet(
        new Request(`https://thaiba.edu/api/canteen/transactions?userId=${ownerB}`, { method: "GET" })
      );
      expect(foreignRes.status).toBe(200);
      const foreignData = await foreignRes.json();
      expect(Array.isArray(foreignData.transactions)).toBe(true);
      expect(foreignData.transactions.map((t: { id: string }) => t.id)).not.toContain(txOwnerBId);

      const ownRes = await transactionsGet(
        new Request(`https://thaiba.edu/api/canteen/transactions?userId=${ownerA}`, { method: "GET" })
      );
      expect(ownRes.status).toBe(200);
      const ownData = await ownRes.json();
      expect(ownData.transactions.map((t: { id: string }) => t.id)).toContain(txOwnerAId);
    });

    it("scopes a manager's pass query to their own institutions and 403s non-managers probing others", async () => {
      setSession(sessionA({ staffId: principalA, role: "principal", email: `principal_${suffix}@cnh.test` }));
      const foreignRes = await passesGet(
        new Request(`https://thaiba.edu/api/canteen/passes?userId=${ownerB}`, { method: "GET" })
      );
      expect(foreignRes.status).toBe(200);
      const foreignData = await foreignRes.json();
      expect(foreignData.passes).toEqual([]);

      setSession(sessionA());
      const deniedRes = await passesGet(
        new Request(`https://thaiba.edu/api/canteen/passes?userId=${ownerA}`, { method: "GET" })
      );
      expect(deniedRes.status).toBe(403);
    });

    it("rejects a menu item created against a foreign institution with 403", async () => {
      setSession(sessionA());
      const res = await menuPost(
        jsonReq("https://thaiba.edu/api/canteen/menu", {
          type: "item",
          institutionId: instB,
          name: "Foreign Dosa",
          category: "breakfast",
          price: 25,
        })
      );
      expect(res.status).toBe(403);
    });
  });

  describe("pass state & daily limit enforcement", () => {
    it("rejects redemption on a suspended pass with an explicit error", async () => {
      setSession(sessionA());
      const res = await redeem({
        passCode: codeSuspended,
        items: [{ itemId: "i1", quantity: 1, unitPrice: 5 }],
        idempotencyKey: `k_sus_${suffix}`,
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(String(data.error)).toContain("suspended");
    });

    it("enforces the pass daily limit across cumulative same-day redemptions", async () => {
      setSession(sessionA());
      const first = await redeem({
        passCode: codeLimit,
        items: [{ itemId: "i1", quantity: 1, unitPrice: 30 }],
        idempotencyKey: `k_dl1_${suffix}`,
      });
      expect(first.status).toBe(200);

      const second = await redeem({
        passCode: codeLimit,
        items: [{ itemId: "i1", quantity: 1, unitPrice: 30 }],
        idempotencyKey: `k_dl2_${suffix}`,
      });
      expect(second.status).toBe(400);
      const data = await second.json();
      expect(String(data.error)).toContain("Daily limit");

      const row = await passRow(`pass_cnh_lim_${suffix}`);
      expect(row?.balance).toBe(70);
    });
  });

  describe("meal window enforcement", () => {
    it("rejects redemptions outside serving hours with an explicit closed error", async () => {
      jest.setSystemTime(atHour(22, 30));
      setSession(sessionWindow());
      const res = await redeem({
        passCode: codeW,
        items: [{ itemId: "i1", quantity: 1, unitPrice: 10 }],
        idempotencyKey: `k_closed_${suffix}`,
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(String(data.error).toLowerCase()).toContain("closed");
      const row = await passRow(`pass_cnh_w_${suffix}`);
      expect(row?.balance).toBe(100);
    });

    it("rejects redemptions when no active menu for the current meal type is published", async () => {
      // System time is 13:00 (lunch); instW publishes breakfast only.
      setSession(sessionWindow());
      const res = await redeem({
        passCode: codeW,
        items: [{ itemId: "i1", quantity: 1, unitPrice: 10 }],
        idempotencyKey: `k_menu_${suffix}`,
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(String(data.error).toLowerCase()).toContain("menu");
      const row = await passRow(`pass_cnh_w_${suffix}`);
      expect(row?.balance).toBe(100);
    });
  });

  describe("explicit errors instead of 500s", () => {
    it("returns 409 for a duplicate pass code instead of a unique-constraint crash", async () => {
      setSession(sessionA());
      const res = await passesPost(
        jsonReq("https://thaiba.edu/api/canteen/passes", {
          userId: ownerA,
          passCode: codeA,
          balance: 10,
        })
      );
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(String(data.error).toLowerCase()).toContain("exists");
    });

    it("upserts a menu instead of creating a duplicate for the same date and meal type", async () => {
      setSession(sessionA());
      const payload = {
        type: "menu",
        institutionId: instA,
        date: todayIso(),
        mealType: "snacks",
        itemsJson: JSON.stringify([{ itemId: "item_std", price: 60 }]),
      };
      const first = await menuPost(jsonReq("https://thaiba.edu/api/canteen/menu", payload));
      expect([200, 201]).toContain(first.status);
      const second = await menuPost(jsonReq("https://thaiba.edu/api/canteen/menu", payload));
      expect(second.status).toBe(200);

      const rows = await db
        .select()
        .from(canteenMenus)
        .where(eq(canteenMenus.institutionId, instA))
        .all();
      const snackMenus = rows.filter((m) => m.date === todayIso() && m.mealType === "snacks");
      expect(snackMenus.length).toBe(1);
    });
  });

  describe("mobile parent canteen balance", () => {
    it("returns the caller's own pass when no studentId is supplied", async () => {
      setSession(sessionA());
      const res = await balanceGet(new Request("https://thaiba.edu/api/mobile/v1/parent/canteen-balance", { method: "GET" }));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.passCode).toBe(codeSelfA);
      expect(data.balance).toBe(40);
    });

    it("403s a non-manager querying another user's balance", async () => {
      setSession(sessionA());
      const res = await balanceGet(
        new Request(`https://thaiba.edu/api/mobile/v1/parent/canteen-balance?studentId=${ownerA}`, { method: "GET" })
      );
      expect(res.status).toBe(403);
    });

    it("keeps a manager's cross-user balance query inside their institution scope", async () => {
      setSession(sessionA({ staffId: principalA, role: "principal", email: `principal_${suffix}@cnh.test` }));
      const ownTenant = await balanceGet(
        new Request(`https://thaiba.edu/api/mobile/v1/parent/canteen-balance?studentId=${ownerA}`, { method: "GET" })
      );
      expect(ownTenant.status).toBe(200);
      const ownData = await ownTenant.json();
      expect([codeA, codeSuspended, codeLimit]).toContain(ownData.passCode);

      const foreign = await balanceGet(
        new Request(`https://thaiba.edu/api/mobile/v1/parent/canteen-balance?studentId=${ownerB}`, { method: "GET" })
      );
      expect(foreign.status).toBe(200);
      const foreignData = await foreign.json();
      expect(foreignData.passCode).not.toBe(codeB);
      expect(foreignData.balance).toBe(0);
    });
  });
});
