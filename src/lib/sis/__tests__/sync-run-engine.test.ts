import { SyncRunEngine, ConnectorRunConflictError } from "../sync-run-engine";
import { ConnectorRegistry } from "../connector-registry";
import { EgressGuard } from "../egress-guard";

describe("Gate 17: Sync Run Engine & Single-Flight Concurrency Guard", () => {
  const tenantA = "inst_campus_alpha";
  const tenantB = "inst_campus_beta";
  let connectorAId: string;

  beforeEach(async () => {
    ConnectorRegistry.setUseMemory(true);
    ConnectorRegistry.clearMemory();
    SyncRunEngine.setUseMemory(true);
    SyncRunEngine.clearMemory();
    EgressGuard.clearDnsMocks();

    EgressGuard.setDnsMock("sis.myschool.edu", ["93.184.216.34"]);

    const connector = await ConnectorRegistry.createConnector(tenantA, {
      name: "Alpha Connector",
      standard: "edfi",
      baseUrl: "https://sis.myschool.edu/api/v5",
      credentialRef: "EDFI_KEY",
      enabled: true,
    });
    connectorAId = connector.id;
  });

  afterEach(() => {
    ConnectorRegistry.clearMemory();
    SyncRunEngine.clearMemory();
    EgressGuard.clearDnsMocks();
  });

  it("triggers a new sync run in 'running' state", async () => {
    const run = await SyncRunEngine.triggerRun(tenantA, connectorAId, {
      mode: "full",
    });

    expect(run.id).toMatch(/^sisr_/);
    expect(run.status).toBe("running");
    expect(run.mode).toBe("full");
    expect(run.institutionId).toBe(tenantA);
    expect(run.connectorId).toBe(connectorAId);
  });

  it("enforces Gate 17: rejects concurrent run trigger with 409 conflict error when a run is active", async () => {
    // 1. First run starts and is active ('running')
    const run1 = await SyncRunEngine.triggerRun(tenantA, connectorAId, {
      mode: "full",
    });
    expect(run1.status).toBe("running");

    // 2. Second trigger for same connector must throw ConnectorRunConflictError
    await expect(
      SyncRunEngine.triggerRun(tenantA, connectorAId, { mode: "delta" })
    ).rejects.toThrow(ConnectorRunConflictError);

    try {
      await SyncRunEngine.triggerRun(tenantA, connectorAId, { mode: "delta" });
    } catch (err: any) {
      expect(err).toBeInstanceOf(ConnectorRunConflictError);
      expect(err.activeRunId).toBe(run1.id);
      expect(err.retryAfterSeconds).toBe(60);
      expect(err.message).toContain("already in progress");
    }
  });

  it("allows a subsequent run once the active run finishes ('completed')", async () => {
    const run1 = await SyncRunEngine.triggerRun(tenantA, connectorAId, { mode: "full" });

    // Complete run 1
    await SyncRunEngine.completeRun(tenantA, run1.id, {
      readCount: 150,
      createdCount: 100,
      updatedCount: 40,
      skippedCount: 10,
      failedCount: 0,
      checkpointJson: JSON.stringify({ offset: 150 }),
    });

    const finishedRun = await SyncRunEngine.getRun(tenantA, run1.id);
    expect(finishedRun?.status).toBe("completed");
    expect(finishedRun?.readCount).toBe(150);
    expect(finishedRun?.finishedAt).not.toBeNull();

    // Now trigger run 2 — must succeed without conflict!
    const run2 = await SyncRunEngine.triggerRun(tenantA, connectorAId, { mode: "delta" });
    expect(run2.status).toBe("running");
    expect(run2.id).not.toBe(run1.id);
  });

  it("allows a subsequent run once the active run fails ('failed')", async () => {
    const run1 = await SyncRunEngine.triggerRun(tenantA, connectorAId, { mode: "full" });

    // Fail run 1
    await SyncRunEngine.failRun(tenantA, run1.id, "Upstream HTTP 503 Service Unavailable");

    const failedRun = await SyncRunEngine.getRun(tenantA, run1.id);
    expect(failedRun?.status).toBe("failed");
    expect(failedRun?.errorSummary).toContain("Upstream HTTP 503");

    // Run 2 succeeds
    const run2 = await SyncRunEngine.triggerRun(tenantA, connectorAId, { mode: "full" });
    expect(run2.status).toBe("running");
  });

  it("enforces tenant isolation on sync runs (Gate 8)", async () => {
    const runA = await SyncRunEngine.triggerRun(tenantA, connectorAId, { mode: "full" });

    // Tenant B cannot see run A
    const foundByB = await SyncRunEngine.getRun(tenantB, runA.id);
    expect(foundByB).toBeNull();

    const listB = await SyncRunEngine.listRuns(tenantB);
    expect(listB).toHaveLength(0);

    const listA = await SyncRunEngine.listRuns(tenantA);
    expect(listA).toHaveLength(1);
    expect(listA[0].id).toBe(runA.id);

    // Tenant B cannot complete or fail Tenant A's run
    const completeResult = await SyncRunEngine.completeRun(tenantB, runA.id, {
      readCount: 10,
      createdCount: 10,
      updatedCount: 0,
      skippedCount: 0,
      failedCount: 0,
    });
    expect(completeResult).toBeNull();
  });
});
