import { POST } from "../route";
import { db } from "@/db";
import type { NextRequest } from "next/server";

jest.mock("@/db", () => ({
  db: {
    select: jest.fn(),
    update: jest.fn(),
  },
}));

type MockUser = {
  id: string;
  email: string;
  firstName: string;
  isActive: boolean;
} | null;

let currentUser: MockUser = null;
let consumedToken: { staffId: string } | undefined;

function chainable(terminal: Record<string, jest.Mock>) {
  const chain: Record<string, jest.Mock> = {};
  for (const key of ["select", "from", "where", "update", "set", "returning"]) {
    chain[key] = jest.fn().mockReturnValue(chain);
  }
  Object.assign(chain, terminal);
  return chain;
}

const selectChain = chainable({ get: jest.fn(async () => currentUser) });
const updateChain = chainable({
  returning: jest.fn().mockImplementation(() => updateChain),
  get: jest.fn(async () => consumedToken),
});

function verifyRequest(token: string): NextRequest {
  return new Request(`http://localhost/api/auth/verify-email/${token}`, {
    method: "POST",
  }) as unknown as NextRequest;
}

function routeParams(token: string) {
  return { params: Promise.resolve({ token }) };
}

const VALID_TOKEN = "a".repeat(64);

describe("POST /api/auth/verify-email/[token]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    currentUser = null;
    consumedToken = undefined;
    (db.select as jest.Mock).mockReturnValue(selectChain);
    (db.update as jest.Mock).mockReturnValue(updateChain);
  });

  it("marks the user verified when the token is valid and unused", async () => {
    currentUser = { id: "staff_1", email: "new@thaibahive.edu", firstName: "New", isActive: true };
    consumedToken = { staffId: "staff_1" };

    const res = await POST(verifyRequest(VALID_TOKEN), routeParams(VALID_TOKEN));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });

    // First update consumes the token atomically; second stamps emailVerifiedAt
    expect((db.update as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(2);
    const staffSet = updateChain.set.mock.calls[1][0] as Record<string, unknown>;
    expect(Object.keys(staffSet).sort()).toEqual(["emailVerifiedAt", "updatedAt"]);
    expect(consumedToken).toEqual({ staffId: "staff_1" });
  });

  it("rejects invalid, expired, or already-used tokens with 400", async () => {
    consumedToken = undefined;

    const res = await POST(verifyRequest(VALID_TOKEN), routeParams(VALID_TOKEN));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid or expired verification token" });
    expect(currentUser).toBeNull();
  });

  it("rejects malformed tokens shorter than 16 chars without touching the DB", async () => {
    const res = await POST(verifyRequest("short"), routeParams("short"));
    expect(res.status).toBe(400);
    expect(db.update).not.toHaveBeenCalled();
  });

  it("rejects valid tokens for deleted or inactive users", async () => {
    currentUser = null;
    consumedToken = { staffId: "staff_gone" };

    const res = await POST(verifyRequest(VALID_TOKEN), routeParams(VALID_TOKEN));
    expect(res.status).toBe(400);
  });
});
