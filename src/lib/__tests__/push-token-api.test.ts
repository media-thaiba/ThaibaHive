import { mockNextRequest } from "@/lib/test-helpers/mock-next-request";
import { POST, DELETE } from "@/app/api/mobile/push/register/route";
import { verifySession } from "@thaiba/auth";

jest.mock("@thaiba/auth", () => ({
  ...jest.requireActual("@thaiba/auth"),
  verifySession: jest.fn(),
}));

describe("Push Token Registration API (/api/mobile/push/register)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects unauthenticated requests with HTTP 401", async () => {
    (verifySession as jest.Mock).mockResolvedValue(null);

    const req = mockNextRequest("http://localhost:3000/api/mobile/push/register", {
      method: "POST",
      body: { token: "fcm_test_token_123", platform: "android" },
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("validates token payload schema and rejects missing token", async () => {
    (verifySession as jest.Mock).mockResolvedValue({ staffId: "usr_001", role: "staff" });

    const req = mockNextRequest("http://localhost:3000/api/mobile/push/register", {
      method: "POST",
      headers: {
        authorization: "Bearer mock_jwt_token",
      },
      body: { platform: "android" },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid token payload");
  });
});
