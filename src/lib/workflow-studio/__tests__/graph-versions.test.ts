import { WorkflowStudioStore } from "../graph-store";
import type { StudioCanvasState } from "../graph-compiler";

const TENANT = "inst_test";

function linearCanvas(labels: string[]): StudioCanvasState {
  const nodes = [
    {
      id: "trigger",
      position: { x: 0, y: 0 },
      data: { label: "Trigger", nodeType: "trigger" as const, trigger: { type: "manual" as const } },
    },
    ...labels.map((label, i) => ({
      id: `step_${i}`,
      position: { x: (i + 1) * 280, y: 0 },
      data: { label, nodeType: "action" as const, tool: "demo.execute" },
    })),
  ];
  const edges = [
    { source: "trigger", target: "step_0" },
    ...labels.slice(0, -1).map((_, i) => ({ source: `step_${i}`, target: `step_${i + 1}` })),
  ];
  return { nodes, edges };
}

describe("WorkflowStudioStore: version history", () => {
  let store: WorkflowStudioStore;
  let originalMax: number;

  beforeEach(() => {
    store = WorkflowStudioStore.getInstance();
    store.clearMemoryStore();
    originalMax = store.maxVersionsPerGraph;
  });

  afterEach(() => {
    store.maxVersionsPerGraph = originalMax;
    store.clearMemoryStore();
  });

  async function createGraph(name = "Fee Escalation") {
    const result = await store.createGraph({
      institutionId: TENANT,
      graphName: name,
      description: "v1 draft",
      canvasState: linearCanvas(["a"]),
      createdBy: "staff_1",
      key: "wf_versions",
    });
    expect(result.errors).toEqual([]);
    return result.graph!;
  }

  it("records a create snapshot at version 1", async () => {
    const graph = await createGraph();
    const versions = await store.listVersions(graph.id, TENANT);

    expect(versions).toHaveLength(1);
    expect(versions[0].version).toBe(1);
    expect(versions[0].changeKind).toBe("create");
    expect(versions[0].graphName).toBe("Fee Escalation");
    expect(versions[0].dslHash).toBe(graph.dslHash);
    expect(versions[0].canvasStateJson).toBe(graph.canvasStateJson);
    expect(versions[0].restoredFromVersion).toBeNull();
  });

  it("increments graphVersion and appends an auto_save snapshot on update", async () => {
    const graph = await createGraph();

    const updated = await store.updateGraph(graph.id, TENANT, {
      graphName: "Fee Escalation v2",
      canvasState: linearCanvas(["a", "b"]),
    });
    expect(updated.errors).toEqual([]);
    expect(updated.graph!.graphVersion).toBe(2);

    const versions = await store.listVersions(graph.id, TENANT);
    expect(versions.map((v) => [v.version, v.changeKind])).toEqual([
      [2, "auto_save"],
      [1, "create"],
    ]);
    expect(versions[1].graphName).toBe("Fee Escalation");
  });

  it("records a publish snapshot and marks the graph published", async () => {
    const graph = await createGraph();

    const published = await store.publishGraph(graph.id, TENANT);
    expect(published.errors).toEqual([]);
    expect(published.graph!.status).toBe("published");
    expect(published.graph!.graphVersion).toBe(2);

    const versions = await store.listVersions(graph.id, TENANT);
    expect(versions[0].changeKind).toBe("publish");
    expect(versions[0].status).toBe("published");
    expect(published.workflowId).toBeTruthy();
  });

  it("restores an earlier version as a new draft snapshot", async () => {
    const graph = await createGraph();
    await store.updateGraph(graph.id, TENANT, {
      graphName: "Renamed Later",
      canvasState: linearCanvas(["a", "b", "c"]),
    });

    const restored = await store.restoreVersion(graph.id, TENANT, 1);
    expect(restored.errors).toEqual([]);
    expect(restored.restoredFrom).toBe(1);
    expect(restored.graph!.graphName).toBe("Fee Escalation");
    expect(restored.graph!.graphVersion).toBe(3);
    expect(restored.graph!.status).toBe("draft");

    const parsed = JSON.parse(restored.graph!.canvasStateJson);
    expect(parsed.nodes).toHaveLength(2);

    const versions = await store.listVersions(graph.id, TENANT);
    expect(versions[0].changeKind).toBe("restore");
    expect(versions[0].restoredFromVersion).toBe(1);
    expect(versions).toHaveLength(3);
  });

  it("rejects restoring a version that does not exist", async () => {
    const graph = await createGraph();
    const result = await store.restoreVersion(graph.id, TENANT, 99);
    expect(result.graph).toBeUndefined();
    expect(result.errors).toEqual(["Version not found"]);
  });

  it("returns an empty history for a graph in another tenant", async () => {
    const graph = await createGraph();
    expect(await store.listVersions(graph.id, "inst_other")).toEqual([]);
  });

  it("prunes the oldest snapshots beyond maxVersionsPerGraph", async () => {
    store.maxVersionsPerGraph = 3;
    const graph = await createGraph();

    for (let i = 0; i < 5; i += 1) {
      await store.updateGraph(graph.id, TENANT, {
        canvasState: linearCanvas(["a", `b${i}`]),
      });
    }

    const versions = await store.listVersions(graph.id, TENANT);
    expect(versions).toHaveLength(3);
    expect(versions[0].version).toBe(6);
    expect(versions.map((v) => v.version)).toEqual([6, 5, 4]);
  });

  it("keeps hashes stable so a restored version reproduces its DSL", async () => {
    const graph = await createGraph();
    const originalHash = graph.dslHash;
    await store.updateGraph(graph.id, TENANT, { canvasState: linearCanvas(["a", "b"]) });

    const restored = await store.restoreVersion(graph.id, TENANT, 1);
    expect(restored.graph!.dslHash).toBe(originalHash);
  });
});
