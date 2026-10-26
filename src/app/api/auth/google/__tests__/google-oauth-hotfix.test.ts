/** @jest-environment node */
import { POST } from "../route";
import { db } from "@/db";
import { createSession, verifyGoogleToken } from "@/lib/auth";
import { checkDistributedRateLimit } from "@/lib/api/rate-limit";
import type { NextRequest } from "next/server";

jest.mock("@/db", () => ({
  db: {
    select: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock("@/lib/auth", () => ({
  createSession: jest.fn(),
  verifyGoogleToken: jest.fn(),
}));

jest.mock("@/lib/api/rate-limit", () => ({
  checkDistributedRateLimit: jest.fn(),
  extractIp: jest.fn(() => "127.0.0.1"),
  rateLimitResponse: jest.fn(() => new Response("rate limited", { status: 429 })),
}));

const UNIFORM_BODY = {
  error: "Access denied: Account authorization failed",
  code: "ACCOUNT_NOT_FOUND",
};

type StaffRow = Record<string, unknown>;

let candidates: StaffRow[] = [];
let freshRow: StaffRow | null = null;
let returningRows: StaffRow[] = [];

function makeSelectChain() {
  const chain: Record<string, jest.Mock> = {};
  for (const key of ["from", "where"]) {
    chain[key] = jest.fn().mockReturnValue(chain);
  }
  chain.all = jest.fn(async () => candidates);
  chain.get = jest.fn(async () => freshRow);
  return chain;
}

const updateChain: Record<string, unknown> = {};
updateChain.set = jest.fn().mockReturnValue(updateChain);
updateChain.where = jest.fn().mockReturnValue(updateChain);
updateChain.returning = jest.fn(() => Promise.resolve(returningRows));
(updateChain as { then: unknown }).then = (
  onFulfilled: (v?: undefined) => unknown,
  onRejected: (e: unknown) => unknown
) => Promise.resolve(undefined).then(onFulfilled, onRejected);

const selectChain = makeSelectChain();

function staffRow(overrides: StaffRow = {}): StaffRow {
  return {
    id: "staff_1",
    email: "teacher@thaiba.edu",
    employeeId: "EMP-101",
    firstName: "Ahmed",
    lastName: "Ali",
    role: "staff",
    isActive: true,
    isFirstLogin: false,
    emailVerifiedAt: "2026-01-01T00:00:00.000Z",
    googleSub: null,
    tokenVersion: 1,
    ...overrides,
  };
}

function loginRequest(): NextRequest {
  return new Request("http://localhost/api/auth/google", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken: "signed-google-jwt" }),
  }) as unknown as NextRequest;
}

/** Bodies collected from every rejection branch, asserted identical at the end. */
const rejectionBodies: string[] = [];

async function expectUniformRejection(res: Response): Promise<Record<string, unknown>> {
  expect(res.status).toBe(403);
  const data = await res.json();
  rejectionBodies.push(JSON.stringify(data));
  expect(data).toEqual(UNIFORM_BODY);
  expect(createSession).not.toHaveBeenCalled();
  return data;
}

describe("POST /api/auth/google — Step 1a hotfix", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    candidates = [];
    freshRow = null;
    returningRows = [];
    rejectionBodies.length = 0;

    process.env.GOOGLE_CLIENT_IDS = "test-client.apps.googleusercontent.com";

    (db.select as jest.Mock).mockReturnValue(selectChain);
    (db.update as jest.Mock).mockReturnValue(updateChain);
    (checkDistributedRateLimit as jest.Mock).mockResolvedValue({ allowed: true });
    (createSession as jest.Mock).mockResolvedValue("signed-session-token");

    // Mixed-case input proves the lower() normalization path.
    (verifyGoogleToken as jest.Mock).mockResolvedValue({
      email: "Teacher@Thaiba.Edu",
      sub: "sub_abc123",
      name: "Ahmed Ali",
    });

    selectChain.all.mockImplementation(async () => candidates);
    selectChain.get.mockImplementation(async () => freshRow);
    (updateChain.returning as jest.Mock).mockImplementation(() => Promise.resolve(returningRows));
  });

  afterAll(() => {
    delete process.env.GOOGLE_CLIENT_IDS;
  });

  it("D3/ZERO-JIT: unknown Google account gets uniform 403 with zero writes and no session", async () => {
    candidates = [];

    const res = await POST(loginRequest());

    await expectUniformRejection(res);
    expect(db.update).not.toHaveBeenCalled();
  });

  it("D2: two distinct staff rows matching (email vs sub collision) fails closed", async () => {
    candidates = [
      staffRow({ id: "staff_email_match", googleSub: null }),
      staffRow({ id: "staff_sub_match", email: "other@thaiba.edu", googleSub: "sub_abc123" }),
    ];

    const res = await POST(loginRequest());

    await expectUniformRejection(res);
    expect(db.update).not.toHaveBeenCalled();
  });

  it("D3: deactivated account gets the same uniform 403 body", async () => {
    candidates = [staffRow({ isActive: false })];

    const res = await POST(loginRequest());

    await expectUniformRejection(res);
    expect(db.update).not.toHaveBeenCalled();
  });

  it("D1/D4: already-bound row presenting a different sub is rejected uniformly", async () => {
    candidates = [staffRow({ googleSub: "sub_bound_to_someone_else" })];

    const res = await POST(loginRequest());

    await expectUniformRejection(res);
    expect(db.update).not.toHaveBeenCalled();
  });

  it("D1: loses the bind race to a DIFFERENT sub → 403, session not minted", async () => {
    candidates = [staffRow({ googleSub: null })];
    returningRows = [];
    freshRow = staffRow({ googleSub: "sub_winner_is_someone_else" });

    const res = await POST(loginRequest());

    await expectUniformRejection(res);
    expect(db.update).toHaveBeenCalledTimes(1);
  });

  it("D1: loses the bind race to the SAME sub → proceeds and mints exactly one session", async () => {
    candidates = [staffRow({ googleSub: null })];
    returningRows = [];
    freshRow = staffRow({ googleSub: "sub_abc123" });

    const res = await POST(loginRequest());

    expect(res.status).toBe(200);
    expect(createSession).toHaveBeenCalledTimes(1);
    expect((createSession as jest.Mock).mock.calls[0][0]).toMatchObject({
      staffId: "staff_1",
      email: "teacher@thaiba.edu",
      role: "staff",
    });
  });

  it("D1 + D5: first-login bind succeeds and issues NO redundant second UPDATE", async () => {
    candidates = [staffRow({ googleSub: null, emailVerifiedAt: null })];
    returningRows = [
      staffRow({
        googleSub: "sub_abc123",
        emailVerifiedAt: "2026-10-25T00:00:00.000Z",
      }),
    ];
    freshRow = null;

    const res = await POST(loginRequest());

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user).toMatchObject({ id: "staff_1", role: "staff" });
    // D5: exactly one write — the bind. The follow-up emailVerifiedAt write must not fire.
    expect(db.update).toHaveBeenCalledTimes(1);
    expect(createSession).toHaveBeenCalledTimes(1);
  });

  it("D1: repeat login on an already-bound row writes nothing", async () => {
    candidates = [staffRow({ googleSub: "sub_abc123" })];

    const res = await POST(loginRequest());

    expect(res.status).toBe(200);
    expect(db.update).not.toHaveBeenCalled();
  });

  it("D3: every rejection branch returns a byte-identical body", async () => {
    const branches: Array<() => Promise<Response>> = [
      async () => {
        candidates = [];
        return POST(loginRequest());
      },
      async () => {
        candidates = [staffRow({ isActive: false })];
        return POST(loginRequest());
      },
      async () => {
        candidates = [staffRow({ googleSub: "sub_other" })];
        return POST(loginRequest());
      },
      async () => {
        candidates = [staffRow({ googleSub: null })];
        returningRows = [];
        freshRow = staffRow({ googleSub: "sub_other" });
        return POST(loginRequest());
      },
      async () => {
        candidates = [
          staffRow({ id: "a", googleSub: null }),
          staffRow({ id: "b", googleSub: "sub_abc123" }),
        ];
        return POST(loginRequest());
      },
    ];

    const bodies: string[] = [];
    for (const branch of branches) {
      const res = await branch();
      expect(res.status).toBe(403);
      bodies.push(await res.text());
    }

    expect(new Set(bodies).size).toBe(1);
    expect(JSON.parse(bodies[0])).toEqual(UNIFORM_BODY);
  });
});
