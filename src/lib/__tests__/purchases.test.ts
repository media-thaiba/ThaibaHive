import { POST } from "@/app/api/purchases/route";
import { PATCH } from "@/app/api/purchases/[id]/route";
import { GET as getBudget } from "@/app/api/purchases/budget/route";
import { verifySession } from "@/lib/auth";

const mockGet = jest.fn();
const mockAll = jest.fn();
const mockRun = jest.fn();

const mockChain: Record<string, any> = {
  where: jest.fn(() => mockChain),
  from: jest.fn(() => mockChain),
  select: jest.fn(() => mockChain),
  orderBy: jest.fn(() => mockChain),
  limit: jest.fn(() => mockChain),
  get: mockGet,
  all: mockAll,
  run: mockRun,
  then: (onfulfilled: any) => Promise.resolve(mockAll()).then(onfulfilled),
};

jest.mock("@/db", () => ({
  db: {
    select: jest.fn(() => mockChain),
    insert: jest.fn(() => ({
      values: jest.fn(() => ({
        returning: jest.fn(() => ({
          get: mockGet,
        })),
        run: mockRun,
      })),
    })),
    update: jest.fn(() => ({
      set: jest.fn(() => ({
        where: jest.fn(() => ({
          returning: jest.fn(() => ({
            get: mockGet,
          })),
          run: mockRun,
        })),
      })),
    })),
  },
  purchaseRequests: {
    id: "id",
    requesterId: "requesterId",
    itemName: "itemName",
    quantity: "quantity",
    estimatedCost: "estimatedCost",
    justification: "justification",
    status: "status",
    createdAt: "createdAt",
  },
  institutions: {
    id: "id",
    allocatedBudget: "allocatedBudget",
  },
  staffInstitutions: {
    staffId: "staffId",
    institutionId: "institutionId",
  },
  auditLog: {
    id: "id",
  },
}));

jest.mock("@/lib/auth", () => ({
  verifySession: jest.fn(),
  hasPermission: jest.fn(() => true),
}));

jest.mock("@/lib/auth/department-scope", () => ({
  getManagedStaffIds: jest.fn().mockResolvedValue(["staff_1", "staff_2"]),
  isManagedBy: jest.fn().mockResolvedValue(true),
}));

describe("Purchase Requests API & 3-Tier Approval Flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockReset();
    mockAll.mockReset();
    mockRun.mockReset();
  });

  describe("POST /api/purchases", () => {
    it("should create new purchase request in pending_hod status", async () => {
      const session = { staffId: "staff_1", role: "staff", email: "staff@example.com" };
      (verifySession as jest.Mock).mockResolvedValue(session);

      mockGet.mockResolvedValue({
        id: "pur_1",
        requesterId: "staff_1",
        itemName: "Projector",
        quantity: 1,
        estimatedCost: 25000,
        status: "pending_hod",
      });

      const req = new Request("http://localhost/api/purchases", {
        method: "POST",
        body: JSON.stringify({
          itemName: "Projector",
          quantity: 1,
          estimatedCost: 25000,
          justification: "Classroom presentation equipment",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.purchase).toBeDefined();
      expect(data.purchase.status).toBe("pending_hod");
    });
  });

  describe("PATCH /api/purchases/[id]", () => {
    it("Tier 1: HOD approves pending_hod -> pending_accounts", async () => {
      const session = { staffId: "hod_1", role: "hod", email: "hod@example.com" };
      (verifySession as jest.Mock).mockResolvedValue(session);

      mockGet.mockResolvedValueOnce({
        id: "pur_1",
        requesterId: "staff_1",
        itemName: "Projector",
        status: "pending_hod",
      });

      mockGet.mockResolvedValueOnce({
        id: "pur_1",
        requesterId: "staff_1",
        itemName: "Projector",
        status: "pending_accounts",
        approvedByHodId: "hod_1",
      });

      const req = new Request("http://localhost/api/purchases/pur_1", {
        method: "PATCH",
        body: JSON.stringify({ status: "pending_accounts", notes: "HOD approved" }),
      });

      const res = await PATCH(req, { params: Promise.resolve({ id: "pur_1" }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.purchase.status).toBe("pending_accounts");
    });

    it("Tier 2: Accounts approves pending_accounts -> pending_purchase", async () => {
      const session = { staffId: "acc_1", role: "accounts", email: "accounts@example.com" };
      (verifySession as jest.Mock).mockResolvedValue(session);

      mockGet.mockResolvedValueOnce({
        id: "pur_1",
        requesterId: "staff_1",
        itemName: "Projector",
        status: "pending_accounts",
      });

      mockGet.mockResolvedValueOnce({
        id: "pur_1",
        requesterId: "staff_1",
        itemName: "Projector",
        status: "pending_purchase",
        approvedByAccountsId: "acc_1",
      });

      const req = new Request("http://localhost/api/purchases/pur_1", {
        method: "PATCH",
        body: JSON.stringify({ status: "pending_purchase", notes: "Budget verified" }),
      });

      const res = await PATCH(req, { params: Promise.resolve({ id: "pur_1" }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.purchase.status).toBe("pending_purchase");
    });

    it("Tier 3: Purchase Manager approves pending_purchase -> approved", async () => {
      const session = { staffId: "pm_1", role: "purchase", email: "pm@example.com" };
      (verifySession as jest.Mock).mockResolvedValue(session);

      mockGet.mockResolvedValueOnce({
        id: "pur_1",
        requesterId: "staff_1",
        itemName: "Projector",
        status: "pending_purchase",
      });

      mockGet.mockResolvedValueOnce({
        id: "pur_1",
        requesterId: "staff_1",
        itemName: "Projector",
        status: "approved",
        approvedByPurchaseId: "pm_1",
      });

      const req = new Request("http://localhost/api/purchases/pur_1", {
        method: "PATCH",
        body: JSON.stringify({ status: "approved", notes: "Order issued to vendor" }),
      });

      const res = await PATCH(req, { params: Promise.resolve({ id: "pur_1" }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.purchase.status).toBe("approved");
    });
  });

  describe("GET /api/purchases/budget", () => {
    it("should return calculated institution budget summary", async () => {
      const session = { staffId: "staff_1", role: "staff", email: "staff@example.com" };
      (verifySession as jest.Mock).mockResolvedValue(session);

      mockAll.mockResolvedValueOnce([{ institutionId: "inst_1" }]); // callerInstitution
      mockGet.mockResolvedValueOnce({ allocatedBudget: 100000 }); // institution
      mockAll.mockResolvedValueOnce([{ staffId: "staff_1" }]); // staffInInstitution
      mockGet.mockResolvedValueOnce({ totalCost: 30000 }); // approvedPurchases
      mockGet.mockResolvedValueOnce({ totalCost: 20000 }); // pendingPurchases

      const req = new Request("http://localhost/api/purchases/budget");
      const res = await getBudget(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.budget).toBeDefined();
      expect(data.budget.totalAllocated).toBe(100000);
      expect(data.budget.totalSpent).toBe(30000);
      expect(data.budget.totalPending).toBe(20000);
      expect(data.budget.remaining).toBe(50000);
    });
  });
});
