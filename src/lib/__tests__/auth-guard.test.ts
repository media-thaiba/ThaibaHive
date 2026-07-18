import { requireAuth } from "@/lib/api/auth-guard";
import { verifySession, hasPermission } from "@/lib/auth";
import { NextResponse } from "next/server";

jest.mock("@/lib/auth", () => ({
  verifySession: jest.fn(),
  hasPermission: jest.fn(),
}));

describe("requireAuth middleware", () => {
  let mockHandler: jest.Mock;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockHandler = jest.fn().mockResolvedValue(NextResponse.json({ success: true }, { status: 200 }));
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("should return 401 if session is not authenticated", async () => {
    (verifySession as jest.Mock).mockResolvedValue(null);

    const wrapped = requireAuth(mockHandler);
    const req = new Request("http://localhost/api/test");
    const res = await wrapped(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "Not authenticated" });
    expect(mockHandler).not.toHaveBeenCalled();
  });

  it("should succeed and call handler if session exists and no permission is required", async () => {
    const sessionPayload = { staffId: "123", role: "staff", email: "test@example.com" };
    (verifySession as jest.Mock).mockResolvedValue(sessionPayload);

    const wrapped = requireAuth(mockHandler);
    const req = new Request("http://localhost/api/test");
    const res = await wrapped(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ success: true });
    expect(mockHandler).toHaveBeenCalledWith(req, sessionPayload, undefined);
  });

  it("should succeed and call handler if session exists and user has required permission", async () => {
    const sessionPayload = { staffId: "123", role: "staff", email: "test@example.com" };
    (verifySession as jest.Mock).mockResolvedValue(sessionPayload);
    (hasPermission as jest.Mock).mockReturnValue(true);

    const wrapped = requireAuth(mockHandler, "tasks:read");
    const req = new Request("http://localhost/api/test");
    const res = await wrapped(req);

    expect(res.status).toBe(200);
    expect(hasPermission).toHaveBeenCalledWith("staff", "tasks:read");
    expect(mockHandler).toHaveBeenCalled();
  });

  it("should return 403 and log structured JSON warning if user lacks required permission", async () => {
    const sessionPayload = { staffId: "123", role: "staff", email: "test@example.com" };
    (verifySession as jest.Mock).mockResolvedValue(sessionPayload);
    (hasPermission as jest.Mock).mockReturnValue(false);

    const wrapped = requireAuth(mockHandler, "org:manage");
    const req = new Request("http://localhost/api/test");
    const res = await wrapped(req);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toEqual({ error: "Forbidden" });
    expect(mockHandler).not.toHaveBeenCalled();

    // Verify warning logs
    expect(warnSpy).toHaveBeenCalledTimes(1);
    const logData = JSON.parse(warnSpy.mock.calls[0][0]);
    expect(logData).toEqual({
      event: "unauthorized_access_attempt",
      staffId: "123",
      role: "staff",
      requiredPermission: "org:manage",
      url: "http://localhost/api/test",
      timestamp: expect.any(String),
    });
  });

  it("should return 500 and log error if the handler throws an exception", async () => {
    const sessionPayload = { staffId: "123", role: "staff", email: "test@example.com" };
    (verifySession as jest.Mock).mockResolvedValue(sessionPayload);
    mockHandler.mockRejectedValue(new Error("Test database error"));

    const wrapped = requireAuth(mockHandler);
    const req = new Request("http://localhost/api/test");
    const res = await wrapped(req);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "Internal server error" });
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });
});
