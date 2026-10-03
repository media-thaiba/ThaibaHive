import { resolveRequestInstitution } from "@/lib/api/auth-guard";
import { POST } from "../route";
import { db } from "@/db";
import type { NextRequest } from "next/server";

jest.mock("@/db", () => ({
  db: {
    select: jest.fn(),
    update: jest.fn(),
    insert: jest.fn(),
    delete: jest.fn(),
    transaction: jest.fn(),
  },
}));

jest.mock("@/lib/api/auth-guard", () => ({
  requireAuth: (handler: (req: unknown, session: unknown) => unknown) => (req: unknown) =>
    handler(req, { staffId: "staff_1", role: "staff" }),
}));

function chainable(terminal: Record<string, jest.Mock>) {
  const chain: Record<string, jest.Mock> = {};
  for (const key of ["select", "from", "where", "insert", "values", "run"]) {
    chain[key] = jest.fn().mockReturnValue(chain);
  }
  Object.assign(chain, terminal);
  return chain;
}

function postBatch(mutations: unknown[]): NextRequest {
  return new Request("http://localhost/api/mobile/v1/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mutations }),
  }) as unknown as NextRequest;
}

const LEAVE_MUTATION = {
  id: "evt_leave_1",
  action: "leave_apply",
  timestamp: "2026-09-27T08:00:00.000Z",
  payload: {
    leave_type_id: "lt_1",
    start_date: "2026-10-01",
    end_date: "2026-10-02",
    days: 2,
    reason: "Family event",
  },
};

describe("POST /api/mobile/v1/sync", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("applies mutations once and replays idempotently", async () => {
    // First call: not processed -> balance ok -> leave inserted -> processed recorded
    const processedCheckEmpty = chainable({ get: jest.fn(async () => null) });
    const txSelect = chainable({ get: jest.fn(async () => ({ totalDays: 12, usedDays: 2 })) });
    const txInsert = chainable({ run: jest.fn(async () => undefined) });
    const processedInsert = chainable({ run: jest.fn(async () => undefined) });

    (db.select as jest.Mock).mockReturnValueOnce(processedCheckEmpty);
    (db.transaction as jest.Mock).mockImplementationOnce(async (fn: (tx: unknown) => unknown) =>
      fn({ select: () => txSelect, insert: () => txInsert })
    );
    (db.insert as jest.Mock).mockReturnValueOnce(processedInsert);

    const first = await POST(postBatch([LEAVE_MUTATION]));
    expect(first.status).toBe(200);
    expect(await first.json()).toMatchObject({
      success: true,
      processedMutations: ["evt_leave_1"],
      failedMutations: [],
    });
    expect(txInsert.values).toHaveBeenCalledTimes(1);

    // Second call with the same client event ID: acknowledged without re-applying
    const processedCheckHit = chainable({
      get: jest.fn(async () => ({ clientEventId: "evt_leave_1" })),
    });
    (db.select as jest.Mock).mockReturnValueOnce(processedCheckHit);

    const second = await POST(postBatch([LEAVE_MUTATION]));
    expect(second.status).toBe(200);
    expect(await second.json()).toMatchObject({
      success: true,
      processedMutations: ["evt_leave_1"],
      failedMutations: [],
    });
    expect(txInsert.values).toHaveBeenCalledTimes(1);
    expect(db.transaction as jest.Mock).toHaveBeenCalledTimes(1);
  });

  it("reports validation failures without applying", async () => {
    const processedCheckEmpty = chainable({ get: jest.fn(async () => null) });
    (db.select as jest.Mock).mockReturnValueOnce(processedCheckEmpty);

    const res = await POST(
      postBatch([{ id: "evt_bad_1", action: "leave_apply", timestamp: "x", payload: {} }])
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      success: true,
      processedMutations: [],
      failedMutations: ["evt_bad_1"],
    });
    expect(db.transaction as jest.Mock).not.toHaveBeenCalled();
  });

  it("rejects unknown actions and malformed mutations", async () => {
    const processedCheckEmpty = chainable({ get: jest.fn(async () => null) });
    (db.select as jest.Mock).mockReturnValueOnce(processedCheckEmpty);

    const res = await POST(
      postBatch([
        { id: "evt_unknown_1", action: "teleport", timestamp: "x", payload: {} },
        { id: "", action: "", timestamp: "x", payload: {} },
      ])
    );
    const body = await res.json();
    expect(body.failedMutations).toEqual(["evt_unknown_1", "unknown"]);
    expect(body.processedMutations).toEqual([]);
  });
});
