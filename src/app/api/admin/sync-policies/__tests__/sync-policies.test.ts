import { verifySession, hasPermission } from "@thaiba/auth";
import { db } from "@/db";
import { syncTuningPolicies } from "@/db/schema";
import { eq } from "drizzle-orm";

jest.mock("@thaiba/auth", () => ({
  verifySession: jest.fn(),
  hasPermission: jest.fn(),
}));

jest.mock("@/db", () => ({
  db: {
    select: jest.fn(() => ({
      from: jest.fn(() => ({
        all: jest.fn(),
        where: jest.fn(() => ({
          get: jest.fn(),
        })),
      })),
    })),
    update: jest.fn(() => ({
      set: jest.fn(() => ({
        where: jest.fn(() => ({
          run: jest.fn(),
        })),
      })),
    })),
  },
}));

describe("Sync Policies Administration API REST Endpoints", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("GET: retrieves policies listing when authorized", async () => {
    (verifySession as jest.Mock).mockResolvedValue({
      staffId: "usr_admin_01",
      role: "admin",
    });
    (hasPermission as jest.Mock).mockReturnValue(true);

    const mockPolicies = [
      { id: "pol_wifi", networkType: "WIFI", batchSize: 100 },
      { id: "pol_cellular", networkType: "CELLULAR", batchSize: 25 },
    ];

    const mockSelect = db.select as jest.Mock;
    mockSelect.mockReturnValueOnce({
      from: jest.fn(() => ({
        all: jest.fn().mockResolvedValue(mockPolicies),
      })),
    });

    const { GET } = await import("../route");
    const req = new Request("http://localhost:3000/api/admin/sync-policies");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.policies).toEqual(mockPolicies);
  });

  it("POST: rejects policy update when unauthorized (role check fails)", async () => {
    (verifySession as jest.Mock).mockResolvedValue({
      staffId: "usr_staff_01",
      role: "staff",
    });
    (hasPermission as jest.Mock).mockReturnValue(false);

    const { POST } = await import("../route");
    const req = new Request("http://localhost:3000/api/admin/sync-policies", {
      method: "POST",
      body: JSON.stringify({ id: "pol_wifi", batchSize: 80 }),
    });
    const res = await POST(req);

    expect(res.status).toBe(403);
  });

  it("POST: rejects policy update when parameters fail Zod constraints (batchSize too large)", async () => {
    (verifySession as jest.Mock).mockResolvedValue({
      staffId: "usr_admin_01",
      role: "admin",
    });
    (hasPermission as jest.Mock).mockReturnValue(true);

    const { POST } = await import("../route");
    const req = new Request("http://localhost:3000/api/admin/sync-policies", {
      method: "POST",
      body: JSON.stringify({ id: "pol_wifi", batchSize: 300 }), // Max is 200
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("POST: updates policy parameters successfully and logs audit trail when authorized", async () => {
    (verifySession as jest.Mock).mockResolvedValue({
      staffId: "usr_admin_01",
      role: "admin",
    });
    (hasPermission as jest.Mock).mockReturnValue(true);

    const mockSelect = db.select as jest.Mock;
    mockSelect.mockReturnValueOnce({
      from: jest.fn(() => ({
        where: jest.fn(() => ({
          get: jest.fn().mockResolvedValue({ id: "pol_wifi", networkType: "WIFI" }),
        })),
      })),
    });

    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    const { POST } = await import("../route");
    const req = new Request("http://localhost:3000/api/admin/sync-policies", {
      method: "POST",
      body: JSON.stringify({ id: "pol_wifi", batchSize: 75, compressionLevel: 4 }),
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    expect(db.update).toHaveBeenCalledWith(syncTuningPolicies);
    expect(consoleSpy).toHaveBeenCalled();
    
    // Check if console output contains the event type
    const consoleOutput = consoleSpy.mock.calls[0][0];
    expect(consoleOutput).toContain("sync_policy_updated");
    expect(consoleOutput).toContain("usr_admin_01");

    consoleSpy.mockRestore();
  });
});
