import { RecordMapper } from "../record-mapper";
import type { NormalizedRecord } from "../adapters/types";

describe("Wave 3: RecordMapper & Idempotency Engine (Gate 9)", () => {
  const tenantA = "inst_campus_alpha";
  const connectorId = "sisc_conn_1";

  beforeEach(() => {
    RecordMapper.setUseMemory(true);
    RecordMapper.clearMemory();
  });

  afterEach(() => {
    RecordMapper.clearMemory();
  });

  it("enforces Gate 9: idempotent replay on identical payload produces action 'skip'", async () => {
    const record: NormalizedRecord = {
      entityType: "students",
      externalId: "EXT_999",
      sourceStandard: "edfi",
      payload: {
        externalId: "EXT_999",
        firstName: "Tariq",
        lastName: "Jamil",
        email: "tariq@school.edu",
      },
    };

    // 1. First run -> creates sync record and enqueues to mapping queue
    const res1 = await RecordMapper.processRecord(tenantA, connectorId, record, "run_1");
    expect(res1.action).toBe("create");
    expect(res1.state).toBe("unmatched");
    expect(res1.queued).toBe(true);

    // 2. Replay with identical payload -> Gate 9 skip
    const res2 = await RecordMapper.processRecord(tenantA, connectorId, record, "run_2");
    expect(res2.action).toBe("skip");
    expect(res2.state).toBe("unmatched");
    expect(res2.queued).toBe(false);

    // Ensure queue has only 1 item (no duplicate queued items)
    const queueItems = await RecordMapper.listQueueItems(tenantA);
    expect(queueItems).toHaveLength(1);
    expect(queueItems[0].externalId).toBe("EXT_999");
  });

  it("detects payload changes and performs 'update'", async () => {
    const record1: NormalizedRecord = {
      entityType: "students",
      externalId: "EXT_100",
      sourceStandard: "edfi",
      payload: {
        externalId: "EXT_100",
        email: "old.email@school.edu",
      },
    };

    const res1 = await RecordMapper.processRecord(tenantA, connectorId, record1, "run_1");
    expect(res1.action).toBe("create");

    // Change email in payload
    const record2: NormalizedRecord = {
      ...record1,
      payload: {
        externalId: "EXT_100",
        email: "new.email@school.edu",
      },
    };

    const res2 = await RecordMapper.processRecord(tenantA, connectorId, record2, "run_2");
    expect(res2.action).toBe("update");
  });

  it("resolves mapping queue items with action 'map' and updates identity map", async () => {
    const record: NormalizedRecord = {
      entityType: "students",
      externalId: "EXT_RESOLVE_1",
      sourceStandard: "edfi",
      payload: {
        externalId: "EXT_RESOLVE_1",
        email: "unmatched@school.edu",
      },
    };

    await RecordMapper.processRecord(tenantA, connectorId, record, "run_1");
    const queue = await RecordMapper.listQueueItems(tenantA);
    expect(queue).toHaveLength(1);
    const item = queue[0];
    expect(item.status).toBe("pending");

    // Resolve queue item
    const resolved = await RecordMapper.resolveQueueItem(
      tenantA,
      item.id,
      {
        action: "map",
        localTable: "students",
        localId: "stu_local_555",
      },
      "staff_reviewer"
    );

    expect(resolved.success).toBe(true);
    expect(resolved.queueItem.status).toBe("mapped");
    expect(resolved.queueItem.resolvedBy).toBe("staff_reviewer");
  });

  it("resolves mapping queue items with action 'ignore'", async () => {
    const record: NormalizedRecord = {
      entityType: "staff",
      externalId: "EXT_IGNORE_1",
      sourceStandard: "edfi",
      payload: {
        externalId: "EXT_IGNORE_1",
      },
    };

    await RecordMapper.processRecord(tenantA, connectorId, record, "run_1");
    const [item] = await RecordMapper.listQueueItems(tenantA);

    const resolved = await RecordMapper.resolveQueueItem(tenantA, item.id, {
      action: "ignore",
    });

    expect(resolved.success).toBe(true);
    expect(resolved.queueItem.status).toBe("ignored");
  });
});
