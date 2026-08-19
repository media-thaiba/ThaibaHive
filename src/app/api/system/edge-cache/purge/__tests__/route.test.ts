import { POST } from "../route";
import crypto from "crypto";

jest.mock("@thaiba/auth", () => ({
  verifySession: jest.fn(),
}));

describe("POST /api/system/edge-cache/purge", () => {
  const { verifySession } = require("@thaiba/auth");
  const secret = "test-edge-purge-secret";

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EDGE_PURGE_SECRET = secret;
  });

  test("rejects request without HMAC signature or valid session with 401", async () => {
    verifySession.mockResolvedValue(null);
    const req = new Request("http://localhost/api/system/edge-cache/purge", {
      method: "POST",
      body: JSON.stringify({ tags: ["inst-101"] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  test("authorizes request with valid HMAC signature header", async () => {
    const rawBody = JSON.stringify({ tags: ["inst-101", "dept-cs"] });
    const hmac = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

    const req = new Request("http://localhost/api/system/edge-cache/purge", {
      method: "POST",
      headers: { "x-edge-signature": hmac },
      body: rawBody,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.purgedTags).toEqual(["inst-101", "dept-cs"]);
  });

  test("authorizes super_admin session without HMAC header", async () => {
    verifySession.mockResolvedValue({ role: "super_admin", id: "admin-1" });
    const rawBody = JSON.stringify({ purgeAll: true });

    const req = new Request("http://localhost/api/system/edge-cache/purge", {
      method: "POST",
      body: rawBody,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.isGlobalPurge).toBe(true);
  });
});
