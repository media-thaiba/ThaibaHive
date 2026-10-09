import { GET } from "../conflicts/route";
import { POST as RESOLVE } from "../conflicts/[id]/resolve/route";
import { db } from "@/db";

jest.mock("@/db", () => ({
  db: {
    select: jest.fn(),
    update: jest.fn(),
    insert: jest.fn(),
    delete: jest.fn(),
    transaction: jest.fn(),
  },
}));

const mockSession = { staffId: "staff_1", role: "staff", institutionId: "inst_a" };

jest.mock("@/lib/api/auth-guard", () => ({
  requireAuth:
    (handler: (req: unknown, session: unknown, ctx?: unknown) => unknown) =>
    (req: unknown, ctx?: unknown) =>
      handler(req, { ...mockSession }, ctx),
}));

jest.mock("@/lib/auth", () => ({
  resolveScopedInstitutionId: jest.fn(async (requested?: string | null) => requested ?? null),
}));

function chainable(terminal: Record<string, jest.Mock>) {
  const chain: Record<string, jest.Mock> = {};
  for (const key of ["select", "from", "where", "insert", "values", "update", "set", "run"]) {
    chain[key] = jest.fn().mockReturnValue(chain);
  }
  Object.assign(chain, terminal);
  return chain;
}

function resetDbMocks() {
  for (const key of ["select", "update", "insert", "delete", "transaction"]) {
    (db[key as keyof typeof db] as unknown as jest.Mock | undefined)?.mockReset?.();
  }
}

function outboxRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "oc_1",
    tenantId: "inst_a",
    userId: "staff_1",
    deviceId: "dev_1",
    mutationType: "UPDATE",
    entityType: "task",
    payloadJson: JSON.stringify({ id: "t_1", status: "in_progress" }),
    clientTimestamp: "2026-10-07T08:00:00.000Z",
    syncStatus: "CONFLICT",
    conflictDetailsJson: JSON.stringify({
      institutionId: "inst_a",
      clientEventId: "evt_1",
      entityId: "t_1",
      action: "task_update",
      fields: ["status"],
      status: "CONFLICT",
      resolvedAt: null,
    }),
    createdAt: "2026-10-07T08:05:00.000Z",
    ...overrides,
  };
}

function getReq(path: string) {
  return new Request(`http://localhost${path}`) as unknown as Request;
}

function resolveReq(id: string, body: unknown) {
  const req = new Request(`http://localhost/api/mobile/v1/sync/conflicts/${id}/resolve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as Request;
  return { req, ctx: { params: { id } } };
}

function selectOnce(value: unknown, terminal: "get" | "all" = "get") {
  const chain = chainable(
    terminal === "get"
      ? { get: jest.fn(async () => value) }
      : { all: jest.fn(async () => value) }
  );
  (db.select as jest.Mock).mockReturnValueOnce(chain);
  return chain;
}

function updateOnce() {
  const chain = chainable({ run: jest.fn(async () => undefined) });
  (db.update as jest.Mock).mockReturnValueOnce(chain);
  return chain;
}

describe("GET /api/mobile/v1/sync/conflicts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetDbMocks();
    mockSession.role = "staff";
    mockSession.staffId = "staff_1";
    mockSession.institutionId = "inst_a";
  });

  it("lists the caller's CONFLICT/NEEDS_REVIEW rows with parsed envelopes", async () => {
    selectOnce([outboxRow(), outboxRow({ id: "oc_2", syncStatus: "NEEDS_REVIEW" })], "all");

    const res = await GET(getReq("/api/mobile/v1/sync/conflicts"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.conflicts).toHaveLength(2);
    expect(body.conflicts[0]).toMatchObject({
      id: "oc_1",
      clientEventId: "evt_1",
      entityType: "task",
      status: "CONFLICT",
      fields: ["status"],
      payload: { id: "t_1", status: "in_progress" },
      userId: "staff_1",
    });
    expect(body.conflicts[1].status).toBe("NEEDS_REVIEW");
  });

  it("supports since-based polling windows", async () => {
    const selectChain = selectOnce([], "all");

    const res = await GET(getReq("/api/mobile/v1/sync/conflicts?since=2026-10-01T00:00:00.000Z"));

    expect(res.status).toBe(200);
    expect(selectChain.where).toHaveBeenCalledTimes(1);
    expect((await res.json()).conflicts).toEqual([]);
  });

  it("blocks listing another user's conflicts without sync:manage", async () => {
    const res = await GET(
      getReq("/api/mobile/v1/sync/conflicts?userId=other_staff")
    );

    expect(res.status).toBe(403);
    expect(db.select as jest.Mock).not.toHaveBeenCalled();
  });

  it("allows an admin (sync:manage) to list another user's conflicts", async () => {
    mockSession.role = "admin";
    const selectChain = selectOnce([outboxRow({ userId: "other_staff" })], "all");

    const res = await GET(
      getReq("/api/mobile/v1/sync/conflicts?userId=other_staff")
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.conflicts[0].userId).toBe("other_staff");
    expect(selectChain.where).toHaveBeenCalledTimes(1);
  });
});

describe("POST /api/mobile/v1/sync/conflicts/[id]/resolve", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetDbMocks();
    mockSession.role = "staff";
    mockSession.staffId = "staff_1";
    mockSession.institutionId = "inst_a";
  });

  it("returns 404 for an unknown conflict", async () => {
    selectOnce(null);

    const { req, ctx } = resolveReq("missing", { fields: { title: "x" } });
    const res = await RESOLVE(req, ctx);

    expect(res.status).toBe(404);
    expect(db.update as jest.Mock).not.toHaveBeenCalled();
  });

  it("rejects immutable identity fields", async () => {
    selectOnce(outboxRow());

    const { req, ctx } = resolveReq("oc_1", { fields: { institutionId: "evil_inst" } });
    const res = await RESOLVE(req, ctx);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/immutable/i);
    expect(db.update as jest.Mock).not.toHaveBeenCalled();
  });

  it("applies allowed fields to the entity and marks the conflict SYNCED", async () => {
    selectOnce(outboxRow());
    const entityUpdate = updateOnce();
    const outboxUpdate = updateOnce();

    const { req, ctx } = resolveReq("oc_1", { fields: { status: "done" } });
    const res = await RESOLVE(req, ctx);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ success: true, conflict: { id: "oc_1", status: "SYNCED" } });

    expect(entityUpdate.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: "done", updatedAt: expect.any(String) })
    );
    expect(outboxUpdate.set).toHaveBeenCalledWith(
      expect.objectContaining({ syncStatus: "SYNCED" })
    );
    const outboxValues = (outboxUpdate.set as jest.Mock).mock.calls[0][0];
    const details = JSON.parse(outboxValues.conflictDetailsJson);
    expect(details.resolutions).toHaveLength(1);
    expect(details.resolutions[0]).toMatchObject({
      by: "staff_1",
      mode: "client",
      chosen: { status: "done" },
    });
  });

  it("accepts server-side resolution of an approval conflict without field changes", async () => {
    selectOnce(outboxRow({ entityType: "approval", userId: "staff_1" }));
    const outboxUpdate = updateOnce();

    const { req, ctx } = resolveReq("oc_1", { fields: {} });
    const res = await RESOLVE(req, ctx);

    expect(res.status).toBe(200);
    expect(db.update as jest.Mock).toHaveBeenCalledTimes(1); // outbox only — nothing applied
    expect(outboxUpdate.set).toHaveBeenCalledWith(
      expect.objectContaining({ syncStatus: "SYNCED" })
    );
  });

  it("gates NEEDS_REVIEW resolutions behind sync:manage even for the owner", async () => {
    selectOnce(outboxRow({ syncStatus: "NEEDS_REVIEW" }));

    const { req, ctx } = resolveReq("oc_1", { fields: { status: "done" } });
    const res = await RESOLVE(req, ctx);

    expect(res.status).toBe(403); // staff owns the row but lacks sync:manage
    expect(db.update as jest.Mock).not.toHaveBeenCalled();
  });

  it("lets sync:manage resolve a NEEDS_REVIEW row owned by someone else", async () => {
    mockSession.role = "admin";
    selectOnce(
      outboxRow({ syncStatus: "NEEDS_REVIEW", userId: "other_staff" })
    );
    const entityUpdate = updateOnce();
    const outboxUpdate = updateOnce();

    const { req, ctx } = resolveReq("oc_1", { fields: { title: "Reviewed" } });
    const res = await RESOLVE(req, ctx);

    expect(res.status).toBe(200);
    expect(entityUpdate.set).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Reviewed" })
    );
    expect(outboxUpdate.set).toHaveBeenCalledWith(
      expect.objectContaining({ syncStatus: "SYNCED" })
    );
  });

  it("blocks non-owners without sync:manage", async () => {
    selectOnce(outboxRow({ userId: "other_staff" }));

    const { req, ctx } = resolveReq("oc_1", { fields: { status: "done" } });
    const res = await RESOLVE(req, ctx);

    expect(res.status).toBe(403);
    expect(db.update as jest.Mock).not.toHaveBeenCalled();
  });

  it("404s conflicts whose envelope belongs to another institution", async () => {
    selectOnce(
      outboxRow({
        conflictDetailsJson: JSON.stringify({
          institutionId: "inst_b",
          clientEventId: "evt_1",
          fields: ["status"],
        }),
      })
    );

    const { req, ctx } = resolveReq("oc_1", { fields: { status: "done" } });
    const res = await RESOLVE(req, ctx);

    expect(res.status).toBe(404); // never leaks cross-tenant existence
    expect(db.update as jest.Mock).not.toHaveBeenCalled();
  });

  it("409s already-resolved conflicts", async () => {
    selectOnce(outboxRow({ syncStatus: "SYNCED" }));

    const { req, ctx } = resolveReq("oc_1", { fields: { status: "done" } });
    const res = await RESOLVE(req, ctx);

    expect(res.status).toBe(409);
    expect(db.update as jest.Mock).not.toHaveBeenCalled();
  });

  it("rejects non-JSON bodies", async () => {
    selectOnce(outboxRow());
    const req = new Request(
      "http://localhost/api/mobile/v1/sync/conflicts/oc_1/resolve",
      { method: "POST", body: "not-json" }
    ) as unknown as Request;

    const res = await RESOLVE(req, { params: { id: "oc_1" } });
    expect(res.status).toBe(400);
  });
});
