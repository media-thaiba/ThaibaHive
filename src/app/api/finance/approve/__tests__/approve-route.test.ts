import { db } from "@/db";
import { expenseClaims, purchaseRequests, staff, departments, staffDepartments } from "@/db/schema";
import { POST } from "../route";
import { eq } from "drizzle-orm";

jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: jest.fn(),
    hasPermission: jest.fn().mockReturnValue(true),
  };
});

describe("POST /api/finance/approve Route Integration", () => {
  const timestamp = Date.now();
  const requesterId = `staff-req-${timestamp}`;
  const hodId = `hod-user-${timestamp}`;
  const accountsId = `accounts-user-${timestamp}`;
  const purchaseId = `purchase-user-${timestamp}`;
  const expenseId = `exp-test-${timestamp}`;
  const purchaseReqId = `pr-test-${timestamp}`;

  beforeAll(async () => {
    // Seed staff records
    await db.insert(staff).values([
      {
        id: requesterId,
        email: `requester-${timestamp}@test.local`,
        employeeId: `REQ-${timestamp}`,
        firstName: "Requester",
        lastName: "User",
        role: "staff",
      },
      {
        id: hodId,
        email: `hod-${timestamp}@test.local`,
        employeeId: `HOD-${timestamp}`,
        firstName: "HOD",
        lastName: "User",
        role: "hod",
      },
      {
        id: accountsId,
        email: `accounts-${timestamp}@test.local`,
        employeeId: `ACC-${timestamp}`,
        firstName: "Accounts",
        lastName: "Officer",
        role: "accounts",
      },
      {
        id: purchaseId,
        email: `purchase-${timestamp}@test.local`,
        employeeId: `PUR-${timestamp}`,
        firstName: "Purchase",
        lastName: "Officer",
        role: "purchase",
      },
    ]).run();

    // Seed test expense claim in pending_accounts
    await db.insert(expenseClaims).values({
      id: expenseId,
      staffId: requesterId,
      amount: 1500,
      category: "travel",
      description: "Inter-campus travel",
      status: "pending_accounts",
      createdAt: new Date().toISOString(),
    }).run();

    // Seed test purchase request in pending_purchase
    await db.insert(purchaseRequests).values({
      id: purchaseReqId,
      requesterId,
      itemName: "Lab Hardware",
      estimatedCost: 2400,
      status: "pending_purchase",
      createdAt: new Date().toISOString(),
    }).run();
  });

  afterAll(async () => {
    await db.delete(expenseClaims).where(eq(expenseClaims.id, expenseId)).run();
    await db.delete(purchaseRequests).where(eq(purchaseRequests.id, purchaseReqId)).run();
    await db.delete(staff).where(eq(staff.id, requesterId)).run();
    await db.delete(staff).where(eq(staff.id, hodId)).run();
    await db.delete(staff).where(eq(staff.id, accountsId)).run();
    await db.delete(staff).where(eq(staff.id, purchaseId)).run();
  });

  it("permits accounts specialist to approve expense claim", async () => {
    const { verifySession } = require("@thaiba/auth");
    verifySession.mockResolvedValueOnce({
      staffId: accountsId,
      role: "accounts",
      email: `accounts-${timestamp}@test.local`,
    });

    const req = new Request("http://localhost/api/finance/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId: expenseId,
        requestType: "expense",
        action: "approve",
        notes: "Accounts verified and approved",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.status).toBe("approved");

    const claim = await db.select().from(expenseClaims).where(eq(expenseClaims.id, expenseId)).get();
    expect(claim?.status).toBe("approved");
  });

  it("permits purchase specialist to approve purchase request", async () => {
    const { verifySession } = require("@thaiba/auth");
    verifySession.mockResolvedValueOnce({
      staffId: purchaseId,
      role: "purchase",
      email: `purchase-${timestamp}@test.local`,
    });

    const req = new Request("http://localhost/api/finance/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId: purchaseReqId,
        requestType: "purchase",
        action: "approve",
        notes: "Purchase specialist sign-off",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.status).toBe("approved");

    const purchase = await db.select().from(purchaseRequests).where(eq(purchaseRequests.id, purchaseReqId)).get();
    expect(purchase?.status).toBe("approved");
  });

  it("enforces anti-self-approval rule when requester attempts approval", async () => {
    const { verifySession } = require("@thaiba/auth");
    verifySession.mockResolvedValueOnce({
      staffId: requesterId,
      role: "admin", // Even if requester has admin role, anti-self-approval triggers unless super_admin
      email: `requester-${timestamp}@test.local`,
    });

    const req = new Request("http://localhost/api/finance/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId: purchaseReqId,
        requestType: "purchase",
        action: "approve",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("cannot review or approve their own");
  });

  it("allows return action to return request for correction", async () => {
    // Reset expense claim to pending_accounts
    await db.update(expenseClaims).set({ status: "pending_accounts" }).where(eq(expenseClaims.id, expenseId)).run();

    const { verifySession } = require("@thaiba/auth");
    verifySession.mockResolvedValueOnce({
      staffId: accountsId,
      role: "accounts",
      email: `accounts-${timestamp}@test.local`,
    });

    const req = new Request("http://localhost/api/finance/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId: expenseId,
        requestType: "expense",
        action: "return",
        notes: "Missing GST invoice breakdown",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("returned");

    const claim = await db.select().from(expenseClaims).where(eq(expenseClaims.id, expenseId)).get();
    expect(claim?.status).toBe("returned");
  });

  it("persists reviewer-attached receiptUrl during claim approval", async () => {
    // Reset expense claim to pending_accounts
    await db.update(expenseClaims).set({ status: "pending_accounts", receiptUrl: null }).where(eq(expenseClaims.id, expenseId)).run();

    const { verifySession } = require("@thaiba/auth");
    verifySession.mockResolvedValueOnce({
      staffId: accountsId,
      role: "accounts",
      email: `accounts-${timestamp}@test.local`,
    });

    const testReceiptUrl = "/api/upload/files/invoice-sample-receipt.pdf";
    const req = new Request("http://localhost/api/finance/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId: expenseId,
        requestType: "expense",
        action: "approve",
        notes: "Verified receipt attached",
        receiptUrl: testReceiptUrl,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const claim = await db.select().from(expenseClaims).where(eq(expenseClaims.id, expenseId)).get();
    expect(claim?.status).toBe("approved");
    expect(claim?.receiptUrl).toBe(testReceiptUrl);
  });
});
