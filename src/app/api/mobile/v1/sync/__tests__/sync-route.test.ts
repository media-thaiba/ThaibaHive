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
    handler(req, { staffId: "staff_1", role: "staff", institutionId: "inst_a" }),
}));

function chainable(terminal: Record<string, jest.Mock>) {
  const chain: Record<string, jest.Mock> = {};
  for (const key of ["select", "from", "where", "insert", "values", "update", "set", "returning", "run"]) {
    chain[key] = jest.fn().mockReturnValue(chain);
  }
  Object.assign(chain, terminal);
  return chain;
}

// clearAllMocks does NOT drain mockReturnValueOnce queues — a test that
// registers a once-value it never consumes shifts every later select/insert
// by one. Reset the db mocks between tests so queues start empty.
function resetDbMocks() {
  for (const key of ["select", "update", "insert", "delete", "transaction"]) {
    (db[key as keyof typeof db] as unknown as jest.Mock | undefined)?.mockReset?.();
  }
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
    resetDbMocks();
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

describe("POST /api/mobile/v1/sync — payload v2 + conflict hold (Phase 3)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetDbMocks();
  });

  const NOW = Date.now();

  function selectOnce(value: unknown, terminal: "get" = "get") {
    const chain = chainable(
      terminal === "get" ? { get: jest.fn(async () => value) } : { all: jest.fn(async () => value) }
    );
    (db.select as jest.Mock).mockReturnValueOnce(chain);
    return chain;
  }

  function insertOnce() {
    const chain = chainable({ run: jest.fn(async () => undefined) });
    (db.insert as jest.Mock).mockReturnValueOnce(chain);
    return chain;
  }

  function updateOnce() {
    const chain = chainable({ run: jest.fn(async () => undefined) });
    (db.update as jest.Mock).mockReturnValueOnce(chain);
    return chain;
  }

  it("applies a client-newer task mutation after LWW (payload v2 metadata accepted)", async () => {
    selectOnce(null); // not already processed
    selectOnce({
      id: "t_1",
      title: "Old",
      status: "todo",
      assignedToId: "staff_1",
      assignedById: "staff_1",
      updatedAt: "2020-01-01T00:00:00.000Z",
    }); // fetchSyncServerRecord — server record is stale
    selectOnce({ id: "t_1", assignedToId: "staff_1", assignedById: "staff_1" }); // loadOwnedTask
    const updateChain = updateOnce();
    const processedInsert = insertOnce();

    const res = await POST(
      postBatch([
        {
          id: "evt_task_1",
          action: "task_update",
          timestamp: "2026-10-07T10:00:00.000Z",
          payload: { id: "t_1", status: "done" },
          mutationType: "UPDATE",
          entityType: "task",
        },
      ])
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      success: true,
      processedMutations: ["evt_task_1"],
      failedMutations: [],
      conflicts: [],
    });
    expect(updateChain.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: "done" })
    );
    expect(db.insert as jest.Mock).toHaveBeenCalledTimes(1); // only mobileSyncProcessed
    expect(processedInsert.values as jest.Mock).toHaveBeenCalledWith(
      expect.objectContaining({ clientEventId: "evt_task_1" })
    );
  });

  it("holds a server-newer mutation: payload NOT applied, conflict persisted + reported", async () => {
    selectOnce(null); // not already processed
    selectOnce({
      id: "t_2",
      status: "todo",
      assignedToId: "staff_1",
      assignedById: "staff_1",
      updatedAt: new Date().toISOString(), // server record newer than the clamped client timestamp
    });
    const outboxInsert = insertOnce();
    const processedInsert = insertOnce();

    const staleTs = "2000-01-01T00:00:00.000Z";
    const res = await POST(
      postBatch([
        {
          id: "evt_task_hold",
          action: "task_update",
          timestamp: staleTs,
          payload: { id: "t_2", status: "in_progress" },
          mutationType: "UPDATE",
          entityType: "task",
        },
      ])
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.processedMutations).toEqual(["evt_task_hold"]); // conflicts are terminal for the transport
    expect(body.failedMutations).toEqual([]);
    expect(body.conflicts).toEqual([
      {
        clientEventId: "evt_task_hold",
        entityType: "task",
        status: "CONFLICT",
        fields: ["status"],
      },
    ]);

    // Payload must NOT be applied on hold
    expect(db.update as jest.Mock).not.toHaveBeenCalled();

    // Conflict row persisted with the envelope tenant key + clamped timestamp
    expect(db.insert as jest.Mock).toHaveBeenCalledTimes(2); // outbox, then processed
    const outboxValues = (outboxInsert.values as jest.Mock).mock.calls[0][0];
    expect(outboxValues).toMatchObject({
      syncStatus: "CONFLICT",
      tenantId: "inst_a",
      userId: "staff_1",
      entityType: "task",
      mutationType: "UPDATE",
    });
    const clampedMs = Date.parse(outboxValues.clientTimestamp);
    expect(clampedMs).toBeGreaterThanOrEqual(NOW - 7 * 24 * 60 * 60 * 1000); // lower clamp (stale input)
    expect(clampedMs).toBeLessThanOrEqual(Date.now());
    const details = JSON.parse(outboxValues.conflictDetailsJson);
    expect(details).toMatchObject({
      institutionId: "inst_a",
      clientEventId: "evt_task_hold",
      entityId: "t_2",
      status: "CONFLICT",
      fields: ["status"],
      resolvedAt: null,
    });
    expect(processedInsert.values as jest.Mock).toHaveBeenCalledWith(
      expect.objectContaining({ clientEventId: "evt_task_hold" })
    );
  });

  it("escalates 3+ divergent fields to NEEDS_REVIEW", async () => {
    selectOnce(null);
    selectOnce({
      id: "t_3",
      title: "Old",
      status: "todo",
      priority: "low",
      assignedToId: "staff_1",
      assignedById: "staff_1",
      updatedAt: new Date().toISOString(),
    });
    const outboxInsert = insertOnce();
    insertOnce(); // processed

    const res = await POST(
      postBatch([
        {
          id: "evt_task_review",
          action: "task_update",
          timestamp: "2000-01-01T00:00:00.000Z",
          payload: { id: "t_3", title: "New", status: "doing", priority: "high" },
        },
      ])
    );

    const body = await res.json();
    expect(body.conflicts[0]).toMatchObject({
      clientEventId: "evt_task_review",
      status: "NEEDS_REVIEW",
    });
    expect(body.conflicts[0].fields.sort()).toEqual(["priority", "status", "title"]);
    expect((outboxInsert.values as jest.Mock).mock.calls[0][0].syncStatus).toBe("NEEDS_REVIEW");
    expect(db.update as jest.Mock).not.toHaveBeenCalled();
  });

  it("rejects client-declared metadata that disagrees with the server map", async () => {
    const res = await POST(
      postBatch([
        {
          id: "evt_mismatch",
          action: "task_update",
          timestamp: new Date().toISOString(),
          payload: { id: "t_1" },
          mutationType: "CREATE", // server map says UPDATE
        },
      ])
    );

    const body = await res.json();
    expect(body.failedMutations).toEqual(["evt_mismatch"]);
    expect(body.processedMutations).toEqual([]);
    expect(db.select as jest.Mock).not.toHaveBeenCalled(); // rejected before any I/O
    expect(db.insert as jest.Mock).not.toHaveBeenCalled();
  });

  it("acknowledges already-processed conflicts without double-persisting", async () => {
    selectOnce({ clientEventId: "evt_task_hold" });

    const res = await POST(
      postBatch([
        {
          id: "evt_task_hold",
          action: "task_update",
          timestamp: "2000-01-01T00:00:00.000Z",
          payload: { id: "t_2", status: "in_progress" },
        },
      ])
    );

    const body = await res.json();
    expect(body).toMatchObject({
      success: true,
      processedMutations: ["evt_task_hold"],
      conflicts: [],
    });
    expect(db.insert as jest.Mock).not.toHaveBeenCalled(); // replay: no second outbox row
  });
});
