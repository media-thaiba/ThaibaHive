import { POST } from "../route";
import { db } from "@/db";
import { sendPasswordResetEmail } from "@/lib/email";
import type { NextRequest } from "next/server";
import crypto from "crypto";

jest.mock("@/db", () => ({
  db: {
    select: jest.fn(),
    update: jest.fn(),
    insert: jest.fn(),
  },
}));

jest.mock("@/lib/email", () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock("@vercel/functions", () => ({
  waitUntil: (promise: Promise<unknown>) => promise,
}));

type MockUser = {
  id: string;
  email: string;
  firstName: string;
  isActive: boolean;
} | null;

let currentUser: MockUser = null;

function chainable(terminal: Record<string, jest.Mock>) {
  const chain: Record<string, jest.Mock> = {};
  for (const key of ["select", "from", "where", "update", "set", "insert", "values", "returning"]) {
    chain[key] = jest.fn().mockReturnValue(chain);
  }
  Object.assign(chain, terminal);
  return chain;
}

const selectChain = chainable({ get: jest.fn(async () => currentUser) });
const updateChain = chainable({});
const insertChain = chainable({ values: jest.fn(async () => undefined) });

function postRequest(email: unknown): NextRequest {
  return new Request("http://localhost/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  }) as unknown as NextRequest;
}

describe("POST /api/auth/forgot-password", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    currentUser = null;
    (db.select as jest.Mock).mockReturnValue(selectChain);
    (db.update as jest.Mock).mockReturnValue(updateChain);
    (db.insert as jest.Mock).mockReturnValue(insertChain);
  });

  afterEach(() => {
    delete process.env.ENABLE_RATE_LIMIT;
  });

  it("creates a reset token and sends email for an active user", async () => {
    currentUser = {
      id: "staff_1",
      email: "admin@thaibahive.edu",
      firstName: "Admin",
      isActive: true,
    };

    const res = await POST(postRequest("admin@thaibahive.edu"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });

    // Token row persisted with SHA-256 hash of the emailed token
    expect(insertChain.values).toHaveBeenCalledTimes(1);
    const row = (insertChain.values as jest.Mock).mock.calls[0][0];
    expect(row.staffId).toBe("staff_1");
    expect(row.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(new Date(row.expiresAt).getTime()).toBeGreaterThan(Date.now());

    expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1);
    const [to, firstName, resetUrl] = (sendPasswordResetEmail as jest.Mock).mock.calls[0];
    expect(to).toBe("admin@thaibahive.edu");
    expect(firstName).toBe("Admin");
    expect(resetUrl).toContain("/auth/reset-password/");

    const emailedToken = (resetUrl as string).split("/auth/reset-password/")[1];
    const expectedHash = crypto.createHash("sha256").update(emailedToken).digest("hex");
    expect(row.tokenHash).toBe(expectedHash);
  });

  it("returns the same success response for unknown emails (no enumeration)", async () => {
    currentUser = null;

    const res = await POST(postRequest("ghost@thaibahive.edu"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });

    expect(insertChain.values).not.toHaveBeenCalled();
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("returns the same success response for inactive users", async () => {
    currentUser = {
      id: "staff_2",
      email: "left@thaibahive.edu",
      firstName: "Left",
      isActive: false,
    };

    const res = await POST(postRequest("left@thaibahive.edu"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });

    expect(insertChain.values).not.toHaveBeenCalled();
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("rejects invalid email format with 400", async () => {
    const res = await POST(postRequest("not-an-email"));
    expect(res.status).toBe(400);
    expect(insertChain.values).not.toHaveBeenCalled();
  });

  it("rate limits repeated requests for the same email with 429", async () => {
    process.env.ENABLE_RATE_LIMIT = "true";
    currentUser = null;
    const email = `ratelimit-${Date.now()}@thaibahive.edu`;

    for (let i = 0; i < 3; i++) {
      const res = await POST(postRequest(email));
      expect(res.status).toBe(200);
    }
    const limited = await POST(postRequest(email));
    expect(limited.status).toBe(429);
  });
});
