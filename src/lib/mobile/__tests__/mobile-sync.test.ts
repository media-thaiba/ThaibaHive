import { POST } from "@/app/api/mobile/v1/sync/route";
import { verifySession } from "@thaiba/auth";

jest.mock("@thaiba/auth", () => ({
  ...jest.requireActual("@thaiba/auth"),
  verifySession: jest.fn(),
  hasPermission: jest.fn().mockReturnValue(true),
}));

jest.mock("@/lib/mobile/sync-appliers", () => ({
  applySyncMutation: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock("@/db", () => ({
  db: {
    select: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue(null),
        }),
      }),
    }),
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockReturnValue({
        run: jest.fn().mockResolvedValue({}),
      }),
    }),
  },
}));

describe("Mobile Sync Reconciliation API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifySession as jest.Mock).mockResolvedValue({
      staffId: "usr_mock",
      email: "mock@thaibahive.edu",
      role: "staff",
      institutionId: "inst_001",
    });
  });

  it("should process offline mutation batch successfully", async () => {
    const req = new Request("http://localhost:3000/api/mobile/v1/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lastSyncedAt: new Date(Date.now() - 3600000).toISOString(),
        mutations: [
          {
            id: "mut_1001",
            action: "STAFF_CHECKIN",
            timestamp: new Date().toISOString(),
            payload: { location: "Main Gate", latitude: 11.25, longitude: 75.78 },
          },
          {
            id: "mut_1002",
            action: "VOUCHER_APPROVAL",
            timestamp: new Date().toISOString(),
            payload: { voucherId: "v-99", decision: "approve" },
          },
        ],
      }),
    });

    const res = await POST(req);

    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.processedMutations).toContain("mut_1001");
    expect(json.processedMutations).toContain("mut_1002");
    expect(json.syncedAt).toBeDefined();
  });
});
