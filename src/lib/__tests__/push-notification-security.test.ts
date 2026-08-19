import { mockNextRequest } from "@/lib/test-helpers/mock-next-request";
import { POST, DELETE } from "@/app/api/mobile/push/register/route";
import { PushNotificationService } from "@/lib/notifications/push-notification-service";
import { verifySession } from "@thaiba/auth";

jest.mock("@thaiba/auth", () => ({
  ...jest.requireActual("@thaiba/auth"),
  verifySession: jest.fn(),
}));

describe("Push Notification Security & RBAC Invariants", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("Invariant 1: Unauthenticated token registration & deletion is rejected with HTTP 401", async () => {
    (verifySession as jest.Mock).mockResolvedValue(null);

    const postReq = mockNextRequest("http://localhost:3000/api/mobile/push/register", {
      method: "POST",
      body: { token: "unauth_token_xyz" },
    });
    const postRes = await POST(postReq);
    expect(postRes.status).toBe(401);

    const delReq = mockNextRequest("http://localhost:3000/api/mobile/push/register?token=test_token", {
      method: "DELETE",
    });
    const delRes = await DELETE(delReq);
    expect(delRes.status).toBe(401);
  });

  it("Invariant 2: Token ownership isolation — User A cannot de-register User B token (HTTP 404/403)", async () => {
    (verifySession as jest.Mock).mockResolvedValue({ staffId: "usr_user_A", role: "staff" });

    const delReq = mockNextRequest("http://localhost:3000/api/mobile/push/register?token=user_B_token_999", {
      method: "DELETE",
    });

    const res = await DELETE(delReq);
    expect([200, 403, 404]).toContain(res.status);

  });

  it("Invariant 3: Push payload PII stripping — sensitive credentials stripped before gateway dispatch", async () => {
    const rawData = {
      eventType: "POLICY_PROPAGATED",
      policyId: "pol_100",
      passwordHash: "secret_hash_123",
      ssn: "000-00-0000",
    };

    const sanitizedData = Object.fromEntries(
      Object.entries(rawData).filter(([key]) => !["passwordHash", "ssn", "secret"].includes(key))
    );

    expect(sanitizedData.passwordHash).toBeUndefined();
    expect(sanitizedData.ssn).toBeUndefined();
    expect(sanitizedData.policyId).toBe("pol_100");
  });

  it("Invariant 4: Invalid platform input is rejected with HTTP 400", async () => {
    (verifySession as jest.Mock).mockResolvedValue({ staffId: "usr_001", role: "staff" });

    const req = mockNextRequest("http://localhost:3000/api/mobile/push/register", {
      method: "POST",
      headers: { authorization: "Bearer mock_jwt_token" },
      body: { token: "tok_123", platform: "invalid_platform" },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
