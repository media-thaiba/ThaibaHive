import { POST } from "@/app/api/expense-claims/route";
import { PATCH } from "@/app/api/expense-claims/[id]/route";
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
  expenseClaims: {
    id: "id",
    staffId: "staffId",
    amount: "amount",
    category: "category",
    description: "description",
    receiptUrl: "receiptUrl",
    status: "status",
    createdAt: "createdAt",
  },
  activityLogs: {
    id: "id",
  },
}));

jest.mock("@/lib/auth", () => ({
  verifySession: jest.fn(),
  hasPermission: jest.fn(() => true),
}));

jest.mock("@/lib/api/rate-limit", () => ({
  checkRateLimit: jest.fn(() => ({ allowed: true })),
  rateLimitResponse: jest.fn(),
}));

jest.mock("@/lib/auth/department-scope", () => ({
  getManagedStaffIds: jest.fn().mockResolvedValue(["staff_1", "staff_2"]),
  isManagedBy: jest.fn().mockResolvedValue(true),
}));

describe("Expense Claims API Flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockReset();
    mockAll.mockReset();
    mockRun.mockReset();
  });

  describe("POST /api/expense-claims", () => {
    it("should require receipt attachment for claims >= ₹1,000", async () => {
      const session = { staffId: "staff_1", role: "staff", email: "staff@example.com" };
      (verifySession as jest.Mock).mockResolvedValue(session);

      const req = new Request("http://localhost/api/expense-claims", {
        method: "POST",
        body: JSON.stringify({
          amount: 1500,
          category: "Travel & Transport",
          description: "Inter-city travel",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Receipt attachment is required");
    });

    it("should allow claims < ₹1,000 without receipt attachment", async () => {
      const session = { staffId: "staff_1", role: "staff", email: "staff@example.com" };
      (verifySession as jest.Mock).mockResolvedValue(session);

      mockGet.mockResolvedValue({
        id: "exp_1",
        staffId: "staff_1",
        amount: 450,
        category: "Food & Meals",
        description: "Team lunch",
        status: "pending",
      });

      const req = new Request("http://localhost/api/expense-claims", {
        method: "POST",
        body: JSON.stringify({
          amount: 450,
          category: "Food & Meals",
          description: "Team lunch",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.claim).toBeDefined();
    });
  });

  describe("PATCH /api/expense-claims/[id]", () => {
    it("should allow HOD to forward claim to Finance (pending_finance)", async () => {
      const session = { staffId: "hod_1", role: "hod", email: "hod@example.com" };
      (verifySession as jest.Mock).mockResolvedValue(session);

      mockGet.mockResolvedValueOnce({
        id: "exp_1",
        staffId: "staff_1",
        amount: 1500,
        status: "pending_hod",
      });

      mockGet.mockResolvedValueOnce({
        id: "exp_1",
        staffId: "staff_1",
        amount: 1500,
        status: "pending_finance",
      });

      const req = new Request("http://localhost/api/expense-claims/exp_1", {
        method: "PATCH",
        body: JSON.stringify({
          status: "pending_finance",
          reviewNotes: "Verified receipt, forwarding to accounts",
        }),
      });

      const res = await PATCH(req, { params: Promise.resolve({ id: "exp_1" }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.claim.status).toBe("pending_finance");
    });
  });
});
