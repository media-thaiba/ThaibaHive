import { POST } from "../route";
import { NextResponse } from "next/server";

// Mock dependencies
jest.mock("@/lib/identity/stepup-auth-helper", () => ({
  resolveStepUpIdentity: jest.fn(),
}));

jest.mock("@/lib/identity/webauthn-service", () => ({
  generateOTPCode: jest.fn(() => "654321"),
}));

jest.mock("@/lib/api/rate-limit", () => ({
  checkDistributedRateLimit: jest.fn().mockResolvedValue({ allowed: true, resetMs: 60000 }),
  rateLimitResponse: jest.fn(() => NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })),
}));

jest.mock("@/lib/email", () => ({
  sendStepUpOTPEmail: jest.fn(),
}));

jest.mock("@/db", () => {
  return {
    db: {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({ email: "staff@example.com", firstName: "Staff" }),
    },
    staff: { id: "id", email: "email", firstName: "first_name" },
  };
});

jest.mock("@/lib/server-logger", () => ({
  serverLogger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

import { resolveStepUpIdentity } from "@/lib/identity/stepup-auth-helper";
import { sendStepUpOTPEmail } from "@/lib/email";

describe("POST /api/auth/stepup/otp (Send OTP Route)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (resolveStepUpIdentity as jest.Mock).mockResolvedValue({
      staffId: "staff-123",
      email: "staff@example.com",
    });
  });

  test("returns HTTP 502 with sanitized message when sendStepUpOTPEmail fails", async () => {
    (sendStepUpOTPEmail as jest.Mock).mockResolvedValue({
      success: false,
      status: "failed",
      error: "Resend API connection error",
    });

    const req = new Request("http://localhost/api/auth/stepup/otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json).toEqual({
      error: "Unable to deliver verification code. Please contact your administrator.",
    });
  });

  test("returns HTTP 200 neutral success with informative message when sendStepUpOTPEmail status is unknown (timeout)", async () => {
    (sendStepUpOTPEmail as jest.Mock).mockResolvedValue({
      success: false,
      status: "unknown",
      error: "Resend email delivery timed out after 8000ms",
    });

    const req = new Request("http://localhost/api/auth/stepup/otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({
      sent: true,
      status: "unknown",
      message: "If you do not receive the verification code shortly, please request another.",
    });
  });

  test("returns HTTP 200 with { sent: true } when sendStepUpOTPEmail succeeds", async () => {
    (sendStepUpOTPEmail as jest.Mock).mockResolvedValue({
      success: true,
      status: "sent",
    });

    const req = new Request("http://localhost/api/auth/stepup/otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ sent: true });
  });

  test("returns HTTP 401 when unauthenticated", async () => {
    (resolveStepUpIdentity as jest.Mock).mockResolvedValue(null);

    const req = new Request("http://localhost/api/auth/stepup/otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});
