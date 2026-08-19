import { mockNextRequest } from "@/lib/test-helpers/mock-next-request";
import { POST, GET } from "@/app/api/mobile/sync/background-status/route";
import { verifySession } from "@thaiba/auth";

jest.mock("@thaiba/auth", () => ({
  ...jest.requireActual("@thaiba/auth"),
  verifySession: jest.fn(),
}));

describe("Background Sync Status API (/api/mobile/sync/background-status)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects unauthenticated requests with HTTP 401", async () => {
    (verifySession as jest.Mock).mockResolvedValue(null);

    const req = mockNextRequest("http://localhost:3000/api/mobile/sync/background-status", {
      method: "POST",
      body: { deviceId: "device_001", recordsProcessed: 5 },
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("validates report payload schema", async () => {
    (verifySession as jest.Mock).mockResolvedValue({ staffId: "usr_001", role: "staff" });

    const req = mockNextRequest("http://localhost:3000/api/mobile/sync/background-status", {
      method: "POST",
      headers: { authorization: "Bearer mock_jwt_token" },
      body: { recordsProcessed: 5 },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
