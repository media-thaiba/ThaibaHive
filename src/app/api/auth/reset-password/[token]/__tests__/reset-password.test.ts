import { POST } from "../route";
import { db } from "@/db";
import { hashPassword } from "@thaiba/auth";

jest.mock("@/db", () => ({
  db: {
    select: jest.fn(),
    update: jest.fn(),
    insert: jest.fn(),
  },
}));

jest.mock("@thaiba/auth", () => ({
  hashPassword: jest.fn().mockResolvedValue("hashed_new_password"),
}));

type ConsumedToken = { id: string; staffId: string } | null;
type MockUser = { id: string; isActive: boolean } | null;

let consumedToken: ConsumedToken = null;
let currentUser: MockUser = null;

function chainable(terminal: Record<string, jest.Mock>) {
  const chain: Record<string, jest.Mock> = {};
  for (const key of ["select", "from", "where", "update", "set", "insert", "values", "returning"]) {
    chain[key] = jest.fn().mockReturnValue(chain);
  }
  Object.assign(chain, terminal);
  return chain;
}

const updateChain = chainable({ get: jest.fn(async () => consumedToken) });
const selectChain = chainable({ get: jest.fn(async () => currentUser) });

function postRequest(token: string, body: unknown): { req: Request; ctx: { params: Promise<{ token: string }> } } {
  return {
    req: new Request(`http://localhost/api/auth/reset-password/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    ctx: { params: Promise.resolve({ token }) },
  };
}

describe("POST /api/auth/reset-password/[token]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    consumedToken = null;
    currentUser = null;
    (db.update as jest.Mock).mockReturnValue(updateChain);
    (db.select as jest.Mock).mockReturnValue(selectChain);
  });

  it("consumes a valid token and updates the password", async () => {
    consumedToken = { id: "tok_1", staffId: "staff_1" };
    currentUser = { id: "staff_1", isActive: true };

    const { req, ctx } = postRequest("valid-token", { password: "newSecurePass1" });
    const res = await POST(req as never, ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });

    expect(hashPassword).toHaveBeenCalledWith("newSecurePass1");
    // First update() consumes the token, second updates staff credentials
    expect(db.update).toHaveBeenCalledTimes(2);

    const staffUpdateSet = (updateChain.set as jest.Mock).mock.calls[1][0];
    expect(staffUpdateSet.passwordHash).toBe("hashed_new_password");
    expect(staffUpdateSet.tokenVersion).toBeDefined();
  });

  it("rejects unknown, expired, or already-used tokens with a generic 400", async () => {
    consumedToken = null;
    currentUser = { id: "staff_1", isActive: true };

    const { req, ctx } = postRequest("bad-token", { password: "newSecurePass1" });
    const res = await POST(req as never, ctx);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid or expired reset token" });

    expect(hashPassword).not.toHaveBeenCalled();
  });

  it("rejects reset when the user is missing or inactive", async () => {
    consumedToken = { id: "tok_2", staffId: "staff_9" };
    currentUser = { id: "staff_9", isActive: false };

    const { req, ctx } = postRequest("orphan-token", { password: "newSecurePass1" });
    const res = await POST(req as never, ctx);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid or expired reset token" });

    expect(hashPassword).not.toHaveBeenCalled();
  });

  it("rejects passwords shorter than 8 characters", async () => {
    consumedToken = { id: "tok_3", staffId: "staff_1" };
    currentUser = { id: "staff_1", isActive: true };

    const { req, ctx } = postRequest("valid-token", { password: "short" });
    const res = await POST(req as never, ctx);
    expect(res.status).toBe(400);

    expect(db.update).not.toHaveBeenCalled();
    expect(hashPassword).not.toHaveBeenCalled();
  });

  it("rejects requests with no password", async () => {
    const { req, ctx } = postRequest("valid-token", {});
    const res = await POST(req as never, ctx);
    expect(res.status).toBe(400);

    expect(db.update).not.toHaveBeenCalled();
  });
});
