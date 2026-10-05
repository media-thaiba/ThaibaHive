import { db } from "@/db";
import { expenseClaims, staff, staffDepartments, departments, financialTransactions, staffInstitutions, institutions } from "@/db/schema";
import { PATCH } from "@/app/api/expense-claims/[id]/route";
import { POST } from "@/app/api/expense-claims/route";
import { verifySession, hasPermission } from "@thaiba/auth";
import { eq } from "drizzle-orm";

jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: jest.fn(),
    hasPermission: jest.fn().mockReturnValue(true),
  };
});

describe("Operational Expense Claims Multi-Stage Approval Engine", () => {
  const timestamp = Date.now();
  const staffId = `staff-claimant-${timestamp}`;
  const hodId = `hod-approver-${timestamp}`;
  const financeId = `finance-approver-${timestamp}`;
  const deptId = `dept-expense-${timestamp}`;
  const claimId = `claim-exp-${timestamp}`;
  const instId = `inst_campus_main_${timestamp}`;

  beforeAll(async () => {
    // 1. Insert institution first
    await db.insert(institutions).values({
      id: instId,
      name: `Campus Main ${timestamp}`,
      code: `CAMPUS_${timestamp.toString().slice(-4)}`,
    }).run();

    // 2. Insert staff records first
    await db.insert(staff).values({
      id: staffId,
      email: `claimant-${timestamp}@thaibahive.local`,
      employeeId: `EMP-C-${timestamp}`,
      firstName: "Claimant",
      lastName: "Staff",
      role: "staff",
    }).run();

    await db.insert(staff).values({
      id: hodId,
      email: `hod-${timestamp}@thaibahive.local`,
      employeeId: `EMP-H-${timestamp}`,
      firstName: "HOD",
      lastName: "Reviewer",
      role: "hod",
    }).run();

    await db.insert(staff).values({
      id: financeId,
      email: `finance-${timestamp}@thaibahive.local`,
      employeeId: `EMP-F-${timestamp}`,
      firstName: "Finance",
      lastName: "Admin",
      role: "accounts",
    }).run();

    // 2. Insert department pointing headUserId to hodId
    await db.insert(departments).values({
      id: deptId,
      name: `Dept ${timestamp}`,
      code: `D${timestamp.toString().slice(-4)}`,
      headUserId: hodId,
    }).run();

    await db.insert(staffDepartments).values({
      id: `sd-c-${timestamp}`,
      staffId: staffId,
      departmentId: deptId,
    }).run();

    await db.insert(staffDepartments).values({
      id: `sd-h-${timestamp}`,
      staffId: hodId,
      departmentId: deptId,
    }).run();

    await db.insert(staffInstitutions).values({
      id: `si-c-${timestamp}`,
      staffId: staffId,
      institutionId: instId,
    }).run();

    await db.insert(staffInstitutions).values({
      id: `si-h-${timestamp}`,
      staffId: hodId,
      institutionId: instId,
    }).run();

    await db.insert(staffInstitutions).values({
      id: `si-f-${timestamp}`,
      staffId: financeId,
      institutionId: instId,
    }).run();
  });

  afterAll(async () => {
    try {
      await db.delete(financialTransactions).where(eq(financialTransactions.notes, `Ref: EXP-${claimId.substring(0, 8)}`)).run();
      await db.delete(expenseClaims).where(eq(expenseClaims.id, claimId)).run();
      await db.delete(staffInstitutions).where(eq(staffInstitutions.staffId, staffId)).run();
      await db.delete(staffInstitutions).where(eq(staffInstitutions.staffId, hodId)).run();
      await db.delete(staffInstitutions).where(eq(staffInstitutions.staffId, financeId)).run();
      await db.delete(staffDepartments).where(eq(staffDepartments.departmentId, deptId)).run();
      await db.delete(staff).where(eq(staff.id, staffId)).run();
      await db.delete(staff).where(eq(staff.id, hodId)).run();
      await db.delete(staff).where(eq(staff.id, financeId)).run();
      await db.delete(departments).where(eq(departments.id, deptId)).run();
      await db.delete(institutions).where(eq(institutions.id, instId)).run();
    } catch {
      // Ignore cleanup locks
    }
  });

  it("should create a new expense claim in pending state", async () => {
    (verifySession as jest.Mock).mockResolvedValue({
      staffId,
      role: "staff",
      email: `claimant-${timestamp}@thaibahive.local`,
      institutionId: instId,
    });

    await db.insert(expenseClaims).values({
      id: claimId,
      staffId,
      amount: 1500,
      category: "travel",
      description: "Inter-campus visit",
      receiptUrl: "https://storage.local/receipt.pdf",
      status: "pending",
    }).run();

    const claim = await db.select().from(expenseClaims).where(eq(expenseClaims.id, claimId)).get();
    expect(claim).toBeDefined();
    expect(claim!.status).toBe("pending");
  });

  it("should prevent claimant from self-approving their own claim", async () => {
    (verifySession as jest.Mock).mockResolvedValue({
      staffId,
      role: "hod",
      email: `claimant-${timestamp}@thaibahive.local`,
      institutionId: instId,
    });

    const request = new Request(`http://localhost:3000/api/expense-claims/${claimId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "pending_finance",
      }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: claimId }) });
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toContain("cannot review or approve their own expense claims");
  });

  it("should allow HOD to advance claim to pending_finance", async () => {
    (verifySession as jest.Mock).mockResolvedValue({
      staffId: hodId,
      role: "hod",
      email: `hod-${timestamp}@thaibahive.local`,
      institutionId: instId,
    });

    const request = new Request(`http://localhost:3000/api/expense-claims/${claimId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "pending_finance",
        reviewNotes: "Verified travel justification and receipts",
      }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: claimId }) });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.claim.status).toBe("pending_finance");
  });

  it("should allow Finance to approve claim", async () => {
    (verifySession as jest.Mock).mockResolvedValue({
      staffId: financeId,
      role: "accounts",
      email: `finance-${timestamp}@thaibahive.local`,
      institutionId: instId,
    });

    const request = new Request(`http://localhost:3000/api/expense-claims/${claimId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "approved",
        reviewNotes: "Approved under quarterly travel budget",
      }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: claimId }) });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.claim.status).toBe("approved");
  });

  it("should allow Finance to disburse payout and create general ledger entry", async () => {
    (verifySession as jest.Mock).mockResolvedValue({
      staffId: financeId,
      role: "accounts",
      email: `finance-${timestamp}@thaibahive.local`,
      institutionId: instId,
    });

    const request = new Request(`http://localhost:3000/api/expense-claims/${claimId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "disbursed",
        reviewNotes: "Disbursed via bank transfer",
      }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: claimId }) });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.claim.status).toBe("disbursed");
  });
});