import { POST } from "../route";
import { db } from "@/db";
import { sendVerificationEmail } from "@/lib/email";
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
  sendVerificationEmail: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock("@vercel/functions", () => ({
  waitUntil: (promise: Promise<unknown>) => promise,
}));

type MockUser = {
  id: string;
  email: string;
  firstName: string;
  isActive: boolean;
  emailVerifiedAt: string | null;
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

function resendRequest(email: unknown): NextRequest {
  return new Request("http://localhost/api/auth/verify-email/resend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  }) as unknown as NextRequest;
}

describe("POST /api/auth/verify-email/resend", () => {
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

  it("creates a verification token and sends email for an unverified active user", async () => {
    currentUser = {
      id: "staff_1",
      email: "new@thaibahive.edu",
      firstName: "New",
      isActive: true,
      emailVerifiedAt: null,
    };

    const res = await POST(resendRequest("new@thaibahive.edu"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });

    expect(insertChain.values).toHaveBeenCalledTimes(1);
    const row = (insertChain.values as jest.Mock).mock.calls[0][0];
    expect(row.staffId).toBe("staff_1");
    expect(row.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(new Date(row.expiresAt).getTime()).toBeGreaterThan(Date.now());

    expect(sendVerificationEmail).toHaveBeenCalledTimes(1);
    const [to, firstName, verifyUrl] = (sendVerificationEmail as jest.Mock).mock.calls[0];
    expect(to).toBe("new@thaibahive.edu");
    expect(firstName).toBe("New");
    expect(verifyUrl).toContain("/auth/verify-email/");

    const emailedToken = (verifyUrl as string).split("/auth/verify-email/")[1];
    const expectedHash = crypto.createHash("sha256").update(emailedToken).digest("hex");
    expect(row.tokenHash).toBe(expectedHash);
  });

  it("does not resend for already-verified users (no enumeration)", async () => {
    currentUser = {
      id: "staff_2",
      email: "done@thaibahive.edu",
      firstName: "Done",
      isActive: true,
      emailVerifiedAt: new Date().toISOString(),
    };

    const res = await POST(resendRequest("done@thaibahive.edu"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });

    expect(insertChain.values).not.toHaveBeenCalled();
    expect(sendVerificationEmail).not.toHaveBeenCalled();
  });

  it("returns the same success response for unknown emails (no enumeration)", async () => {
    currentUser = null;

    const res = await POST(resendRequest("ghost@thaibahive.edu"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });

    expect(insertChain.values).not.toHaveBeenCalled();
    expect(sendVerificationEmail).not.toHaveBeenCalled();
  });

  it("returns the same success response for inactive users", async () => {
    currentUser = {
      id: "staff_3",
      email: "left@thaibahive.edu",
      firstName: "Left",
      isActive: false,
      emailVerifiedAt: null,
    };

    const res = await POST(resendRequest("left@thaibahive.edu"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });

    expect(insertChain.values).not.toHaveBeenCalled();
    expect(sendVerificationEmail).not.toHaveBeenCalled();
  });

  it("rejects invalid email format with 400", async () => {
    const res = await POST(resendRequest("not-an-email"));
    expect(res.status).toBe(400);
    expect(insertChain.values).not.toHaveBeenCalled();
  });

  it("rate limits repeated requests for the same email with 429", async () => {
    process.env.ENABLE_RATE_LIMIT = "true";
    currentUser = null;
    const email = `resend-rl-${Date.now()}@thaibahive.edu`;

    for (let i = 0; i < 3; i++) {
      const res = await POST(resendRequest(email));
      expect(res.status).toBe(200);
    }
    const limited = await POST(resendRequest(email));
    expect(limited.status).toBe(429);
  });
});
