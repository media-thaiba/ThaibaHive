import { db } from "@/db";
import { purchaseRequests, staff, staffDepartments, departments, auditLog } from "@/db/schema";
import { PATCH } from "@/app/api/purchases/[id]/route";
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

describe("Purchase Requisitions Multi-Stage Approval Engine", () => {
  const timestamp = Date.now();
  const requesterId = `staff-req-${timestamp}`;
  const hodId = `hod-req-${timestamp}`;
  const accountsId = `accounts-req-${timestamp}`;
  const purchaseOfficerId = `purchase-officer-${timestamp}`;
  const deptId = `dept-purch-${timestamp}`;
  const purchaseId = `purch-req-${timestamp}`;

  beforeAll(async () => {
    // 1. Insert staff records first
    await db.insert(staff).values({
      id: requesterId,
      email: `requester-${timestamp}@thaibahive.local`,
      employeeId: `EMP-RQ-${timestamp}`,
      firstName: "Requester",
      lastName: "Staff",
      role: "staff",
    }).run();

    await db.insert(staff).values({
      id: hodId,
      email: `hodp-${timestamp}@thaibahive.local`,
      employeeId: `EMP-HP-${timestamp}`,
      firstName: "HOD",
      lastName: "PurchReview",
      role: "hod",
    }).run();

    await db.insert(staff).values({
      id: accountsId,
      email: `accp-${timestamp}@thaibahive.local`,
      employeeId: `EMP-AP-${timestamp}`,
      firstName: "Accounts",
      lastName: "BudgetOfficer",
      role: "accounts",
    }).run();

    await db.insert(staff).values({
      id: purchaseOfficerId,
      email: `purchofficer-${timestamp}@thaibahive.local`,
      employeeId: `EMP-PO-${timestamp}`,
      firstName: "Procurement",
      lastName: "Officer",
      role: "purchase",
    }).run();

    // 2. Insert department pointing headUserId to hodId
    await db.insert(departments).values({
      id: deptId,
      name: `Purch Dept ${timestamp}`,
      code: `P${timestamp.toString().slice(-4)}`,
      headUserId: hodId,
    }).run();

    await db.insert(staffDepartments).values({
      id: `sd-rq-${timestamp}`,
      staffId: requesterId,
      departmentId: deptId,
    }).run();

    await db.insert(staffDepartments).values({
      id: `sd-hp-${timestamp}`,
      staffId: hodId,
      departmentId: deptId,
    }).run();
  });

  afterAll(async () => {
    try {
      await db.delete(auditLog).where(eq(auditLog.entityId, purchaseId)).run();
      await db.delete(purchaseRequests).where(eq(purchaseRequests.id, purchaseId)).run();
      await db.delete(staffDepartments).where(eq(staffDepartments.departmentId, deptId)).run();
      await db.delete(staff).where(eq(staff.id, requesterId)).run();
      await db.delete(staff).where(eq(staff.id, hodId)).run();
      await db.delete(staff).where(eq(staff.id, accountsId)).run();
      await db.delete(staff).where(eq(staff.id, purchaseOfficerId)).run();
      await db.delete(departments).where(eq(departments.id, deptId)).run();
    } catch {
      // Ignore cleanup locks
    }
  });

  it("should create a purchase request in pending_hod state", async () => {
    await db.insert(purchaseRequests).values({
      id: purchaseId,
      requesterId,
      itemName: "Laboratory Microscopes x 5",
      quantity: 5,
      estimatedCost: 75000,
      justification: "Needed for semester biology lab practicals",
      status: "pending_hod",
    }).run();

    const record = await db.select().from(purchaseRequests).where(eq(purchaseRequests.id, purchaseId)).get();
    expect(record).toBeDefined();
    expect(record!.status).toBe("pending_hod");
  });

  it("should prevent requester from self-approving their own purchase request", async () => {
    (verifySession as jest.Mock).mockResolvedValue({
      staffId: requesterId,
      role: "hod", // Even if holding hod role
      email: `requester-${timestamp}@thaibahive.local`,
    });

    const request = new Request(`http://localhost:3000/api/purchases/${purchaseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "pending_accounts",
      }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: purchaseId }) });
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toContain("cannot review or approve their own purchase requests");
  });

  it("should advance from pending_hod to pending_accounts with HOD endorsement", async () => {
    (verifySession as jest.Mock).mockResolvedValue({
      staffId: hodId,
      role: "hod",
      email: `hodp-${timestamp}@thaibahive.local`,
    });

    const request = new Request(`http://localhost:3000/api/purchases/${purchaseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        notes: "Department budget available, approved for laboratory upgrade",
      }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: purchaseId }) });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.purchase.status).toBe("pending_accounts");
    expect(data.purchase.approvedByHodId).toBe(hodId);
  });

  it("should advance from pending_accounts to pending_purchase with Accounts verification", async () => {
    (verifySession as jest.Mock).mockResolvedValue({
      staffId: accountsId,
      role: "accounts",
      email: `accp-${timestamp}@thaibahive.local`,
    });

    const request = new Request(`http://localhost:3000/api/purchases/${purchaseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        notes: "Budget verified against capital expenditure reserve",
      }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: purchaseId }) });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.purchase.status).toBe("pending_purchase");
    expect(data.purchase.approvedByAccountsId).toBe(accountsId);
  });

  it("should finalize approval by Procurement officer", async () => {
    (verifySession as jest.Mock).mockResolvedValue({
      staffId: purchaseOfficerId,
      role: "purchase",
      email: `purchofficer-${timestamp}@thaibahive.local`,
    });

    const request = new Request(`http://localhost:3000/api/purchases/${purchaseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        notes: "PO generated with vendor ABC Labs",
      }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: purchaseId }) });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.purchase.status).toBe("approved");
    expect(data.purchase.approvedByPurchaseId).toBe(purchaseOfficerId);
    expect(data.purchase.approvedAt).toBeDefined();
  });
});
