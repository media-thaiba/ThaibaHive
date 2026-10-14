import { POST } from "../route";
import { db } from "@/db";
import { verifyPassword } from "@/lib/auth";
import type { NextRequest } from "next/server";

jest.mock("@/db", () => ({
  db: {
    select: jest.fn(),
  },
}));

jest.mock("@/lib/auth", () => ({
  verifyPassword: jest.fn(),
  createSession: jest.fn(),
}));

jest.mock("@/lib/api/activity-log", () => ({
  logActivity: jest.fn(),
}));

jest.mock("@/lib/api/public-apm", () => ({
  withPublicApm: (fn: (...args: unknown[]) => unknown) => fn,
}));

jest.mock("@/lib/server-logger", () => ({
  serverLogger: { warn: jest.fn(), info: jest.fn(), error: jest.fn() },
}));

type MockUser = Record<string, unknown> | null;

let currentUser: MockUser = null;

function chainable(terminal: Record<string, jest.Mock>) {
  const chain: Record<string, jest.Mock> = {};
  for (const key of ["select", "from", "where"]) {
    chain[key] = jest.fn().mockReturnValue(chain);
  }
  Object.assign(chain, terminal);
  return chain;
}

const selectChain = chainable({ get: jest.fn(async () => currentUser) });

function loginRequest(email: string, password: string): NextRequest {
  return new Request("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  }) as unknown as NextRequest;
}

describe("POST /api/auth/login — email verification hard block", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    currentUser = null;
    (db.select as jest.Mock).mockReturnValue(selectChain);
    (verifyPassword as jest.Mock).mockResolvedValue(true);
  });

  it("blocks login with 403 EMAIL_NOT_VERIFIED when the account has no emailVerifiedAt", async () => {
    currentUser = {
      id: "staff_1",
      email: "unverified@thaibahive.edu",
      passwordHash: "hash",
      isActive: true,
      role: "staff",
      employeeId: "EMP1",
      firstName: "Un",
      lastName: "Verified",
      emailVerifiedAt: null,
      tokenVersion: 0,
    };

    const res = await POST(loginRequest("unverified@thaibahive.edu", "Password123!"));
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.code).toBe("EMAIL_NOT_VERIFIED");
    expect(data.error).toContain("not verified");
  });

  it("allows login when emailVerifiedAt is set", async () => {
    currentUser = {
      id: "staff_2",
      email: "verified@thaibahive.edu",
      passwordHash: "hash",
      isActive: true,
      role: "staff",
      employeeId: "EMP2",
      firstName: "Ver",
      lastName: "Iffed",
      emailVerifiedAt: new Date().toISOString(),
      tokenVersion: 0,
    };

    const res = await POST(loginRequest("verified@thaibahive.edu", "Password123!"));
    // Not 403 — either success or a later flow issue is fine; the hard block must not fire
    expect(res.status).not.toBe(403);
    const data = await res.json();
    expect(data.code).not.toBe("EMAIL_NOT_VERIFIED");
  });

  it("still returns 401 for wrong passwords regardless of verification state", async () => {
    (verifyPassword as jest.Mock).mockResolvedValue(false);
    currentUser = {
      id: "staff_3",
      email: "verified2@thaibahive.edu",
      passwordHash: "hash",
      isActive: true,
      emailVerifiedAt: new Date().toISOString(),
    };

    const res = await POST(loginRequest("verified2@thaibahive.edu", "wrong-password"));
    expect(res.status).toBe(401);
  });
});
