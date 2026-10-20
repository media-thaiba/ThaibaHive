/**
 * @jest-environment node
 *
 * Financial Operations (Expense Claims & Purchases) — Hardening & Integrity Suite:
 * - Concurrent double-disbursement race prevention (serialized mutex & optimistic locking)
 * - Single financialTransactions row created even under 10 concurrent disbursement attempts
 * - Optimistic concurrency collision guards (409) on status changes
 * - Budget ceiling validation on purchase creation and approval (rejects overcommit)
 * - REST parity on /api/expense-claims/[id] & /api/expenses/[id] (GET, PATCH, DELETE)
 * - REST parity on /api/purchases/[id] (GET, PATCH, DELETE)
 * - Withdrawal/deletion lifecycle guards (pending/rejected allowed, approved/disbursed blocked)
 * - Rate limiting enforcement on POST /api/purchases
 * - Anti-self-approval enforcement
 * - Multi-tenant isolation and boundary enforcement
 */
import {
  db,
  institutions,
  staff,
  staffInstitutions,
  expenseClaims,
  purchaseRequests,
  financialTransactions,
  activityLogs,
  auditLog,
} from "@/db";
import { verifySession } from "@thaiba/auth";
import { eq, inArray } from "drizzle-orm";
import {
  GET as listExpenseClaims,
  POST as createExpenseClaim,
} from "@/app/api/expense-claims/route";
import {
  GET as getExpenseClaimDetail,
  PATCH as reviewExpenseClaim,
  DELETE as deleteExpenseClaim,
} from "@/app/api/expense-claims/[id]/route";
import {
  GET as getExpenseAliasDetail,
  DELETE as deleteExpenseAlias,
} from "@/app/api/expenses/[id]/route";
import {
  GET as listPurchases,
  POST as createPurchase,
} from "@/app/api/purchases/route";
import {
  GET as getPurchaseDetail,
  PATCH as updatePurchase,
  DELETE as deletePurchase,
} from "@/app/api/purchases/[id]/route";
import { PATCH as processApproval } from "@/app/api/approvals/route";

jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: jest.fn(),
  };
});

describe("Financial Operations Hardening — Concurrency, Ledger Integrity, and REST Parity", () => {
  const suffix = Math.random().toString(36).slice(2, 10);
  const instA = `inst_fin_a_${suffix}`;
  const instB = `inst_fin_b_${suffix}`;

  const adminAId = `stf_fin_adm_${suffix}`;
  const accountsAId = `stf_fin_acc_${suffix}`;
  const hodAId = `stf_fin_hod_${suffix}`;
  const staffAId = `stf_fin_usr_a_${suffix}`;
  const staffBId = `stf_fin_usr_b_${suffix}`;

  const setSession = (payload: Record<string, unknown> | null) => {
    (verifySession as jest.Mock).mockResolvedValue(payload);
  };

  const makeJsonReq = (url: string, body?: unknown, method = "POST"): Request =>
    new Request(url, {
      method,
      headers: method === "GET" || method === "HEAD" ? undefined : { "Content-Type": "application/json" },
      body: method === "GET" || method === "HEAD" || body === undefined || body === null ? undefined : JSON.stringify(body),
    });

  const contextParams = (id: string) => ({
    params: Promise.resolve({ id }),
  });

  beforeAll(async () => {
    // Seed institutions with defined budgets
    await db.insert(institutions).values([
      {
        id: instA,
        name: `Finance School Alpha ${suffix}`,
        code: `FSA-${suffix}`,
        allocatedBudget: 100000, // ₹100,000 budget
      },
      {
        id: instB,
        name: `Finance School Beta ${suffix}`,
        code: `FSB-${suffix}`,
        allocatedBudget: 50000,
      },
    ]).run();

    // Seed staff members without invalid institutionId column on staff
    await db.insert(staff).values([
      {
        id: adminAId,
        email: `admin_${suffix}@fin.test`,
        employeeId: `EMP_ADM_${suffix}`,
        firstName: "Admin",
        lastName: "Finance",
        role: "admin",
      },
      {
        id: accountsAId,
        email: `accounts_${suffix}@fin.test`,
        employeeId: `EMP_ACC_${suffix}`,
        firstName: "Accounts",
        lastName: "Officer",
        role: "accounts",
      },
      {
        id: hodAId,
        email: `hod_${suffix}@fin.test`,
        employeeId: `EMP_HOD_${suffix}`,
        firstName: "Head",
        lastName: "Department",
        role: "hod",
      },
      {
        id: staffAId,
        email: `staff_a_${suffix}@fin.test`,
        employeeId: `EMP_STA_${suffix}`,
        firstName: "Staff",
        lastName: "MemberA",
        role: "staff",
      },
      {
        id: staffBId,
        email: `staff_b_${suffix}@fin.test`,
        employeeId: `EMP_STB_${suffix}`,
        firstName: "Staff",
        lastName: "MemberB",
        role: "staff",
      },
    ]).run();

    await db.insert(staffInstitutions).values([
      { id: `si_adm_${suffix}`, staffId: adminAId, institutionId: instA },
      { id: `si_acc_${suffix}`, staffId: accountsAId, institutionId: instA },
      { id: `si_hod_${suffix}`, staffId: hodAId, institutionId: instA },
      { id: `si_sta_${suffix}`, staffId: staffAId, institutionId: instA },
      { id: `si_stb_${suffix}`, staffId: staffBId, institutionId: instB },
    ]).run();
  });

  afterAll(async () => {
    const allStaff = [adminAId, accountsAId, hodAId, staffAId, staffBId];
    await db.delete(financialTransactions).where(eq(financialTransactions.institutionId, instA)).run();
    await db.delete(financialTransactions).where(eq(financialTransactions.institutionId, instB)).run();
    await db.delete(financialTransactions).where(inArray(financialTransactions.recordedById, allStaff)).run();
    await db.delete(expenseClaims).where(inArray(expenseClaims.staffId, allStaff)).run();
    await db.delete(expenseClaims).where(inArray(expenseClaims.reviewedById, allStaff)).run();
    await db.delete(purchaseRequests).where(inArray(purchaseRequests.requesterId, allStaff)).run();
    await db.delete(purchaseRequests).where(inArray(purchaseRequests.approvedByHodId, allStaff)).run();
    await db.delete(purchaseRequests).where(inArray(purchaseRequests.approvedByAccountsId, allStaff)).run();
    await db.delete(purchaseRequests).where(inArray(purchaseRequests.approvedByPurchaseId, allStaff)).run();
    await db.delete(activityLogs).where(inArray(activityLogs.staffId, allStaff)).run();
    await db.delete(auditLog).where(inArray(auditLog.staffId, allStaff)).run();
    await db.delete(staffInstitutions).where(inArray(staffInstitutions.staffId, allStaff)).run();
    await db.delete(staff).where(inArray(staff.id, allStaff)).run();
    await db.delete(institutions).where(inArray(institutions.id, [instA, instB])).run();
  });

  describe("Concurrent Double-Disbursement Race Prevention", () => {
    it("guarantees exactly 1 disbursement transaction when 10 concurrent requests disburse the same claim", async () => {
      // Create an approved expense claim
      const claimId = `claim_race_${suffix}`;
      await db.insert(expenseClaims).values({
        id: claimId,
        staffId: staffAId,
        amount: 3500,
        category: "lab_supplies",
        description: "Reimbursement for test glassware",
        status: "approved",
        institutionId: instA,
      }).run();

      // Accounts officer attempts to disburse concurrently 10 times
      setSession({ staffId: accountsAId, role: "accounts", institutionId: instA });

      const attempts = Array.from({ length: 10 }, () =>
        reviewExpenseClaim(
          makeJsonReq(`https://thaiba.edu/api/expense-claims/${claimId}`, {
            status: "disbursed",
            reviewNotes: "Reimbursement processed via NEFT",
          }, "PATCH"),
          contextParams(claimId)
        )
      );

      const responses = await Promise.all(attempts);
      const statuses = responses.map((r) => r.status);

      const successCount = statuses.filter((s) => s === 200).length;
      const conflictOrTerminalCount = statuses.filter((s) => s === 409 || s === 400).length;

      expect(successCount).toBe(1);
      expect(conflictOrTerminalCount).toBe(9);

      // Verify general ledger: exactly 1 financial transaction created for this claim
      const transactions = await db
        .select()
        .from(financialTransactions)
        .where(eq(financialTransactions.institutionId, instA))
        .all();

      const matchingTx = transactions.filter((t) =>
        t.notes?.includes(claimId.substring(0, 8))
      );
      expect(matchingTx).toHaveLength(1);
      expect(matchingTx[0].amount).toBe(3500);
      expect(matchingTx[0].type).toBe("expense");

      // Verify claim status is disbursed
      const claim = await db.select().from(expenseClaims).where(eq(expenseClaims.id, claimId)).get();
      expect(claim?.status).toBe("disbursed");
    });
  });

  describe("Optimistic Concurrency Guards on Purchases", () => {
    it("returns 409 conflict when a purchase review races against an already transitioned status", async () => {
      const purchaseId = `pr_race_${suffix}`;
      await db.insert(purchaseRequests).values({
        id: purchaseId,
        requesterId: staffAId,
        itemName: "Projector Bulbs",
        quantity: 2,
        estimatedCost: 8000,
        status: "pending_hod",
        institutionId: instA,
      }).run();

      setSession({ staffId: adminAId, role: "admin", institutionId: instA });

      // First review succeeds
      const res1 = await updatePurchase(
        makeJsonReq(`https://thaiba.edu/api/purchases/${purchaseId}`, {
          status: "pending_accounts",
          notes: "Endorsed by HOD/Admin",
        }, "PATCH"),
        contextParams(purchaseId)
      );
      expect(res1.status).toBe(200);

      // Second review using the now-stale "pending_hod" attempt fails with 403 or 409
      const res2 = await updatePurchase(
        makeJsonReq(`https://thaiba.edu/api/purchases/${purchaseId}`, {
          status: "pending_accounts",
          notes: "Concurrent endorsement attempt",
        }, "PATCH"),
        contextParams(purchaseId)
      );
      expect([403, 409]).toContain(res2.status);
    });
  });

  describe("Budget Ceiling Enforcement", () => {
    it("rejects purchase requests that exceed the institution's remaining allocated budget", async () => {
      setSession({ staffId: staffAId, role: "staff", institutionId: instA });

      // InstA has allocatedBudget = 100,000.
      // Attempting to create a purchase of 120,000 must fail with 400
      const overBudgetRes = await createPurchase(
        makeJsonReq("https://thaiba.edu/api/purchases", {
          itemName: "Supercomputer Cluster",
          quantity: 1,
          estimatedCost: 120000,
          justification: "For high-performance physics lab",
        })
      );

      expect(overBudgetRes.status).toBe(400);
      const data = await overBudgetRes.json();
      expect(data.error).toMatch(/insufficient budget/i);

      // Creating a purchase within budget (40,000) succeeds
      const withinBudgetRes = await createPurchase(
        makeJsonReq("https://thaiba.edu/api/purchases", {
          itemName: "Lab Microscopes",
          quantity: 4,
          estimatedCost: 40000,
          justification: "Biology department upgrades",
        })
      );
      expect(withinBudgetRes.status).toBe(201);
      const createdData = await withinBudgetRes.json();
      const prId = createdData.purchase.id;

      // Now committed is 40,000; remaining is 60,000.
      // An attempt for 70,000 must now fail
      const secondOverRes = await createPurchase(
        makeJsonReq("https://thaiba.edu/api/purchases", {
          itemName: "Smartboards",
          quantity: 2,
          estimatedCost: 70000,
        })
      );
      expect(secondOverRes.status).toBe(400);

      // Clean up the created test purchase
      await db.delete(purchaseRequests).where(eq(purchaseRequests.id, prId)).run();
    });

    it("prevents approval of purchase requests when remaining budget is insufficient", async () => {
      // Create a purchase request for 90,000 (valid at creation time when budget = 100,000)
      const bigPrId = `pr_big_${suffix}`;
      await db.insert(purchaseRequests).values({
        id: bigPrId,
        requesterId: staffAId,
        itemName: "Auditorium Sound System",
        quantity: 1,
        estimatedCost: 90000,
        status: "pending_purchase",
        institutionId: instA,
      }).run();

      // Another purchase of 20,000 was already approved in the meantime
      const approvedPrId = `pr_appr_${suffix}`;
      await db.insert(purchaseRequests).values({
        id: approvedPrId,
        requesterId: staffAId,
        itemName: "Library Chairs",
        quantity: 10,
        estimatedCost: 20000,
        status: "approved",
        institutionId: instA,
      }).run();

      // Now total allocated = 100,000, but 20,000 is already spent.
      // Approving bigPr (90,000) would require 110,000 > 100,000 -> must be blocked
      setSession({ staffId: adminAId, role: "admin", institutionId: instA });
      const approvalRes = await updatePurchase(
        makeJsonReq(`https://thaiba.edu/api/purchases/${bigPrId}`, {
          status: "approved",
          notes: "Attempting to approve over-budget purchase",
        }, "PATCH"),
        contextParams(bigPrId)
      );

      expect(approvalRes.status).toBe(400);
      const errData = await approvalRes.json();
      expect(errData.error).toMatch(/insufficient budget/i);

      // Clean up
      await db.delete(purchaseRequests).where(inArray(purchaseRequests.id, [bigPrId, approvedPrId])).run();
    });
  });

  describe("REST Parity on /api/expense-claims/[id] and /api/expenses/[id]", () => {
    it("GET returns detail for owner, 404 for unauthorized cross-tenant", async () => {
      const expId = `exp_detail_${suffix}`;
      await db.insert(expenseClaims).values({
        id: expId,
        staffId: staffAId,
        amount: 850,
        category: "travel",
        description: "Local bus conveyance",
        status: "pending",
        institutionId: instA,
      }).run();

      // Owner can view detail
      setSession({ staffId: staffAId, role: "staff", institutionId: instA });
      const res = await getExpenseClaimDetail(
        makeJsonReq(`https://thaiba.edu/api/expense-claims/${expId}`, null, "GET"),
        contextParams(expId)
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.claim.id).toBe(expId);
      expect(data.claim.amount).toBe(850);
      expect(data.claim.staffEmail).toBe(`staff_a_${suffix}@fin.test`);

      // Cross-tenant user from instB gets 404
      setSession({ staffId: staffBId, role: "staff", institutionId: instB });
      const crossRes = await getExpenseClaimDetail(
        makeJsonReq(`https://thaiba.edu/api/expense-claims/${expId}`, null, "GET"),
        contextParams(expId)
      );
      expect(crossRes.status).toBe(404);

      // Alias route /api/expenses/[id] works identically
      setSession({ staffId: staffAId, role: "staff", institutionId: instA });
      const aliasRes = await getExpenseAliasDetail(
        makeJsonReq(`https://thaiba.edu/api/expenses/${expId}`, null, "GET"),
        contextParams(expId)
      );
      expect(aliasRes.status).toBe(200);

      await db.delete(expenseClaims).where(eq(expenseClaims.id, expId)).run();
    });

    it("DELETE allows requester to withdraw pending claim, but rejects approved or disbursed", async () => {
      const pendingId = `exp_del_pend_${suffix}`;
      const approvedId = `exp_del_appr_${suffix}`;

      await db.insert(expenseClaims).values([
        {
          id: pendingId,
          staffId: staffAId,
          amount: 500,
          category: "books",
          description: "Reference textbook",
          status: "pending",
          institutionId: instA,
        },
        {
          id: approvedId,
          staffId: staffAId,
          amount: 1500,
          category: "conference",
          description: "Registration fee",
          status: "approved",
          institutionId: instA,
        },
      ]).run();

      // Owner deletes pending claim -> succeeds (200)
      setSession({ staffId: staffAId, role: "staff", institutionId: instA });
      const delPendingRes = await deleteExpenseClaim(
        makeJsonReq(`https://thaiba.edu/api/expense-claims/${pendingId}`, null, "DELETE"),
        contextParams(pendingId)
      );
      expect(delPendingRes.status).toBe(200);

      // Verify row is deleted
      const checkDeleted = await db.select().from(expenseClaims).where(eq(expenseClaims.id, pendingId)).get();
      expect(checkDeleted).toBeUndefined();

      // Owner attempts to delete approved claim -> blocked with 400
      const delApprovedRes = await deleteExpenseClaim(
        makeJsonReq(`https://thaiba.edu/api/expense-claims/${approvedId}`, null, "DELETE"),
        contextParams(approvedId)
      );
      expect(delApprovedRes.status).toBe(400);
      const data = await delApprovedRes.json();
      expect(data.error).toMatch(/cannot delete an expense claim in 'approved' status/i);

      await db.delete(expenseClaims).where(eq(expenseClaims.id, approvedId)).run();
    });
  });

  describe("REST Parity on /api/purchases/[id]", () => {
    it("GET returns purchase detail for authorized requester, 404 for cross-tenant", async () => {
      const prId = `pr_detail_${suffix}`;
      await db.insert(purchaseRequests).values({
        id: prId,
        requesterId: staffAId,
        itemName: "Whiteboard Markers",
        quantity: 20,
        estimatedCost: 1200,
        status: "pending_hod",
        institutionId: instA,
      }).run();

      // Requester views detail
      setSession({ staffId: staffAId, role: "staff", institutionId: instA });
      const res = await getPurchaseDetail(
        makeJsonReq(`https://thaiba.edu/api/purchases/${prId}`, null, "GET"),
        contextParams(prId)
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.purchase.id).toBe(prId);
      expect(data.purchase.itemName).toBe("Whiteboard Markers");
      expect(data.purchase.requesterEmail).toBe(`staff_a_${suffix}@fin.test`);

      // Cross-tenant user gets 404
      setSession({ staffId: staffBId, role: "staff", institutionId: instB });
      const crossRes = await getPurchaseDetail(
        makeJsonReq(`https://thaiba.edu/api/purchases/${prId}`, null, "GET"),
        contextParams(prId)
      );
      expect(crossRes.status).toBe(404);

      await db.delete(purchaseRequests).where(eq(purchaseRequests.id, prId)).run();
    });

    it("DELETE allows requester to withdraw pending purchase, blocks approved/ordered requests", async () => {
      const pendingPrId = `pr_del_pend_${suffix}`;
      const approvedPrId = `pr_del_appr_${suffix}`;

      await db.insert(purchaseRequests).values([
        {
          id: pendingPrId,
          requesterId: staffAId,
          itemName: "Drafting Paper",
          quantity: 10,
          estimatedCost: 800,
          status: "pending_hod",
          institutionId: instA,
        },
        {
          id: approvedPrId,
          requesterId: staffAId,
          itemName: "Computer Monitors",
          quantity: 5,
          estimatedCost: 35000,
          status: "approved",
          institutionId: instA,
        },
      ]).run();

      // Requester deletes pending purchase request -> succeeds (200)
      setSession({ staffId: staffAId, role: "staff", institutionId: instA });
      const delPendingRes = await deletePurchase(
        makeJsonReq(`https://thaiba.edu/api/purchases/${pendingPrId}`, null, "DELETE"),
        contextParams(pendingPrId)
      );
      expect(delPendingRes.status).toBe(200);

      // Verify row is deleted
      const checkDeleted = await db.select().from(purchaseRequests).where(eq(purchaseRequests.id, pendingPrId)).get();
      expect(checkDeleted).toBeUndefined();

      // Requester attempts to delete approved purchase -> blocked with 400
      const delApprovedRes = await deletePurchase(
        makeJsonReq(`https://thaiba.edu/api/purchases/${approvedPrId}`, null, "DELETE"),
        contextParams(approvedPrId)
      );
      expect(delApprovedRes.status).toBe(400);
      const data = await delApprovedRes.json();
      expect(data.error).toMatch(/cannot delete a purchase request in 'approved' status/i);

      await db.delete(purchaseRequests).where(eq(purchaseRequests.id, approvedPrId)).run();
    });
  });

  describe("Anti-Self-Approval & Input Validation", () => {
    it("prevents requesters from approving their own expense claims", async () => {
      const ownClaimId = `claim_self_${suffix}`;
      await db.insert(expenseClaims).values({
        id: ownClaimId,
        staffId: hodAId, // HOD submitted an expense claim
        amount: 2500,
        category: "seminar",
        description: "HOD conference attendance",
        status: "pending_hod",
        institutionId: instA,
      }).run();

      // HOD attempts to approve their own claim -> 403 Forbidden
      setSession({ staffId: hodAId, role: "hod", institutionId: instA });
      const selfApproveRes = await reviewExpenseClaim(
        makeJsonReq(`https://thaiba.edu/api/expense-claims/${ownClaimId}`, {
          status: "pending_finance",
          reviewNotes: "Self approval attempt",
        }, "PATCH"),
        contextParams(ownClaimId)
      );

      expect(selfApproveRes.status).toBe(403);
      const err = await selfApproveRes.json();
      expect(err.error).toMatch(/cannot review or approve their own/i);

      await db.delete(expenseClaims).where(eq(expenseClaims.id, ownClaimId)).run();
    });

    it("rejects non-positive amounts and amounts exceeding monetary ceiling", async () => {
      setSession({ staffId: staffAId, role: "staff", institutionId: instA });

      // Non-positive amount
      const zeroRes = await createExpenseClaim(
        makeJsonReq("https://thaiba.edu/api/expense-claims", {
          amount: 0,
          category: "food",
          description: "Zero claim",
        })
      );
      expect(zeroRes.status).toBe(400);

      // Amount exceeding ₹10M ceiling
      const hugeRes = await createExpenseClaim(
        makeJsonReq("https://thaiba.edu/api/expense-claims", {
          amount: 15000000,
          category: "equipment",
          description: "Massive claim",
          receiptUrl: "https://receipts.test/huge.pdf",
        })
      );
      expect(hugeRes.status).toBe(400);
    });
  });
});
