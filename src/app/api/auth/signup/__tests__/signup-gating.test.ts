import { POST } from "../route";
import { db } from "@/db";
import { staff } from "@/db/schema";
import { eq } from "drizzle-orm";

jest.mock("next/headers", () => ({
  cookies: jest.fn().mockResolvedValue({
    set: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
  }),
  headers: jest.fn().mockResolvedValue(new Headers()),
}));

describe("Auth Signup Gating & Security", () => {
  const originalEnv = process.env;
  const testEmail = `gated-signup-${Date.now()}@thaibahive.local`;
  const testEmployeeId = `EMP-SIGNUP-${Date.now()}`;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(async () => {
    process.env = originalEnv;
    try {
      await db.delete(staff).where(eq(staff.email, testEmail)).run();
    } catch {
      // Ignore cleanup locks
    }
  });

  it("should reject public self-registration with 403 when no invitation token is provided and ALLOW_PUBLIC_SIGNUP is false", async () => {
    process.env.ALLOW_PUBLIC_SIGNUP = "false";

    const request = new Request("http://localhost:3000/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        password: "Password123!",
        employeeId: testEmployeeId,
        firstName: "Uninvited",
        lastName: "User",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toContain("Public registration is disabled");
  });

  it("should reject signup when an invalid invitation token is provided", async () => {
    process.env.ALLOW_PUBLIC_SIGNUP = "false";
    process.env.INVITATION_SECRET = "VALID_CAMPUS_SECRET_2026";

    const request = new Request("http://localhost:3000/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        password: "Password123!",
        employeeId: testEmployeeId,
        firstName: "Invalid",
        lastName: "TokenUser",
        invitationToken: "WRONG_SECRET_CODE",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toContain("Invalid or expired invitation token");
  });

  it("should allow signup when a valid invitation token is provided", async () => {
    process.env.ALLOW_PUBLIC_SIGNUP = "false";
    process.env.INVITATION_SECRET = "VALID_CAMPUS_SECRET_2026";

    const request = new Request("http://localhost:3000/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        password: "Password123!",
        employeeId: testEmployeeId,
        firstName: "Invited",
        lastName: "Staff",
        invitationToken: "VALID_CAMPUS_SECRET_2026",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.user).toBeDefined();
    expect(data.user.email).toBe(testEmail);
    expect(data.token).toBeDefined();
  });
});
