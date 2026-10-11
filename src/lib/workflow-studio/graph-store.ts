import { db } from "@thaiba/db";
import { agentWorkflowGraphs, agentWorkflowGraphVersions, agenticWorkflows } from "@thaiba/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { compileCanvasToDsl, computeDslHash, type StudioCanvasState } from "@/lib/workflow-studio/graph-compiler";

export type GraphChangeKind = "create" | "auto_save" | "publish" | "restore";

export type GraphVersionSnapshot = {
  id: string;
  institutionId: string;
  graphId: string;
  version: number;
  graphName: string;
  description: string | null;
  canvasStateJson: string;
  dslPayloadJson: string;
  dslHash: string;
  status: string;
  changeKind: GraphChangeKind;
  restoredFromVersion: number | null;
  createdBy: string | null;
  createdAt: string;
};

export class WorkflowStudioStore {
  private static instance: WorkflowStudioStore;
  public useMemoryOnly: boolean = process.env.NODE_ENV === "test";
  public maxVersionsPerGraph: number = 50;
  private memoryGraphs: Map<string, any> = new Map();
  private memoryVersions: Map<string, GraphVersionSnapshot[]> = new Map();

  public static getInstance(): WorkflowStudioStore {
    if (!WorkflowStudioStore.instance) {
      WorkflowStudioStore.instance = new WorkflowStudioStore();
    }
    return WorkflowStudioStore.instance;
  }

  public clearMemoryStore(): void {
    this.memoryGraphs.clear();
    this.memoryVersions.clear();
  }

  private nextId(prefix = "graph"): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Persist an immutable canvas/DSL snapshot for a graph. Snapshots are append-only
   * and pruned to `maxVersionsPerGraph` (oldest first) so history stays bounded.
   */
  private async recordVersion(
    graph: any,
    changeKind: GraphChangeKind,
    opts: { restoredFromVersion?: number | null; createdBy?: string | null; version?: number } = {}
  ): Promise<GraphVersionSnapshot> {
    const version = opts.version ?? Number(graph.graphVersion ?? 1);
    const snapshot: GraphVersionSnapshot = {
      id: this.nextId("gver"),
      institutionId: graph.institutionId,
      graphId: graph.id,
      version,
      graphName: graph.graphName,
      description: graph.description ?? null,
      canvasStateJson: graph.canvasStateJson,
      dslPayloadJson: graph.dslPayloadJson,
      dslHash: graph.dslHash,
      status: graph.status || "draft",
      changeKind,
      restoredFromVersion: opts.restoredFromVersion ?? null,
      createdBy: opts.createdBy ?? graph.createdBy ?? null,
      createdAt: new Date().toISOString(),
    };

    const bucket = this.memoryVersions.get(graph.id) || [];
    const deduped = bucket.filter((v) => v.version !== snapshot.version);
    deduped.push(snapshot);
    deduped.sort((a, b) => b.version - a.version);
    this.memoryVersions.set(graph.id, deduped.slice(0, this.maxVersionsPerGraph));

    try {
      if (db && !this.useMemoryOnly) {
        await db
          .delete(agentWorkflowGraphVersions)
          .where(and(eq(agentWorkflowGraphVersions.graphId, graph.id), eq(agentWorkflowGraphVersions.version, version)));
        await db.insert(agentWorkflowGraphVersions).values(snapshot as any);
        const overflow = await db
          .select()
          .from(agentWorkflowGraphVersions)
          .where(eq(agentWorkflowGraphVersions.graphId, graph.id))
          .orderBy(desc(agentWorkflowGraphVersions.version));
        const stale = overflow.slice(this.maxVersionsPerGraph);
        if (stale.length > 0) {
          await db
            .delete(agentWorkflowGraphVersions)
            .where(eq(agentWorkflowGraphVersions.id, stale[0].id));
          for (const row of stale.slice(1)) {
            await db.delete(agentWorkflowGraphVersions).where(eq(agentWorkflowGraphVersions.id, row.id));
          }
        }
      }
    } catch {}

    return snapshot;
  }

  async listVersions(graphId: string, tenantId: string): Promise<GraphVersionSnapshot[]> {
    const graph = await this.getGraphById(graphId, tenantId);
    if (!graph) return [];
    const mem = (this.memoryVersions.get(graphId) || []).slice();
    if (this.useMemoryOnly || !db) return mem;
    try {
      const rows = (await db
        .select()
        .from(agentWorkflowGraphVersions)
        .where(
          and(
            eq(agentWorkflowGraphVersions.graphId, graphId),
            eq(agentWorkflowGraphVersions.institutionId, graph.institutionId)
          )
        )
        .orderBy(desc(agentWorkflowGraphVersions.version))) as unknown as GraphVersionSnapshot[];
      const seen = new Set(rows.map((r: any) => r.version));
      return [...rows, ...mem.filter((v) => !seen.has(v.version))].sort(
        (a: any, b: any) => b.version - a.version
      );
    } catch {
      return mem;
    }
  }

  async getVersion(graphId: string, tenantId: string, version: number): Promise<GraphVersionSnapshot | null> {
    const versions = await this.listVersions(graphId, tenantId);
    return versions.find((v) => v.version === version) || null;
  }

  /**
   * Roll the working copy back to a stored snapshot. The restored content is written
   * as a NEW version (changeKind "restore") so the rollback itself is auditable and
   * the graph is marked "draft" until it is re-published.
   */
  async restoreVersion(
    graphId: string,
    tenantId: string,
    version: number
  ): Promise<{ graph?: any; restoredFrom?: number; errors: string[] }> {
    const existing = await this.getGraphById(graphId, tenantId);
    if (!existing) return { errors: ["Graph not found"] };

    const snapshot = await this.getVersion(graphId, tenantId, version);
    if (!snapshot) return { errors: ["Version not found"] };

    let canvasState: StudioCanvasState;
    try {
      canvasState = JSON.parse(snapshot.canvasStateJson) as StudioCanvasState;
    } catch {
      return { errors: ["Stored canvas snapshot is corrupt"] };
    }

    // Restore the snapshot verbatim (canvas + DSL + hash) rather than recompiling,
    // so the rolled-back DSL is byte-identical to what was recorded at that version.
    // Publishing still recompiles from the canvas, which re-validates the graph.
    const nextVersion = Number(existing.graphVersion || 1) + 1;
    const updated = {
      ...existing,
      graphName: snapshot.graphName,
      description: snapshot.description,
      canvasStateJson: JSON.stringify(canvasState),
      dslPayloadJson: snapshot.dslPayloadJson,
      dslHash: snapshot.dslHash,
      graphVersion: nextVersion,
      status: "draft",
      updatedAt: new Date().toISOString(),
    };
    this.memoryGraphs.set(graphId, updated);
    try {
      if (db && !this.useMemoryOnly) {
        await db
          .update(agentWorkflowGraphs)
          .set({
            graphName: updated.graphName,
            description: updated.description,
            canvasStateJson: updated.canvasStateJson,
            dslPayloadJson: updated.dslPayloadJson,
            dslHash: updated.dslHash,
            graphVersion: updated.graphVersion,
            status: "draft",
            updatedAt: updated.updatedAt,
          })
          .where(eq(agentWorkflowGraphs.id, graphId));
      }
    } catch {}

    await this.recordVersion(updated, "restore", { restoredFromVersion: version });
    return { graph: updated, restoredFrom: version, errors: [] };
  }

  async createGraph(data: {
    institutionId: string;
    graphName: string;
    description?: string;
    canvasState: StudioCanvasState;
    createdBy: string;
    key: string;
  }): Promise<{ graph?: any; errors: string[] }> {
    const compile = compileCanvasToDsl(data.canvasState, {
      key: data.key,
      name: data.graphName,
      description: data.description,
    });
    if (!compile.success || !compile.dsl) {
      return { errors: compile.errors };
    }

    const record = {
      id: this.nextId(),
      institutionId: data.institutionId,
      graphName: data.graphName,
      description: data.description || null,
      canvasStateJson: JSON.stringify(data.canvasState),
      dslPayloadJson: JSON.stringify(compile.dsl),
      dslHash: compile.dslHash || computeDslHash(compile.dsl),
      workflowId: null,
      graphVersion: 1,
      status: "draft",
      createdBy: data.createdBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.memoryGraphs.set(record.id, record);
    try {
      if (db && !this.useMemoryOnly) {
        await db.insert(agentWorkflowGraphs).values({
          id: record.id,
          institutionId: record.institutionId,
          graphName: record.graphName,
          description: record.description,
          canvasStateJson: record.canvasStateJson,
          dslPayloadJson: record.dslPayloadJson,
          dslHash: record.dslHash,
          workflowId: null,
          graphVersion: 1,
          status: "draft",
          createdBy: record.createdBy,
        } as any);
      }
    } catch {}
    await this.recordVersion(record, "create");
    return { graph: record, errors: [] };
  }

  async getGraphById(graphId: string, tenantId: string): Promise<any | null> {
    const mem = this.memoryGraphs.get(graphId);
    if (mem && (mem.institutionId === tenantId || tenantId === "global")) {
      return mem;
    }
    if (this.useMemoryOnly || !db) return null;
    try {
      const rows = await db
        .select()
        .from(agentWorkflowGraphs)
        .where(and(eq(agentWorkflowGraphs.id, graphId), eq(agentWorkflowGraphs.institutionId, tenantId)));
      return rows[0] || null;
    } catch {
      return null;
    }
  }

  async listGraphs(tenantId: string, status?: string): Promise<any[]> {
    const memFiltered = Array.from(this.memoryGraphs.values()).filter(
      (g) =>
        (tenantId === "global" || g.institutionId === tenantId) &&
        (!status || g.status === status)
    );
    if (this.useMemoryOnly || !db) return memFiltered;
    try {
      const rows = await db
        .select()
        .from(agentWorkflowGraphs)
        .where(and(eq(agentWorkflowGraphs.institutionId, tenantId), status ? eq(agentWorkflowGraphs.status, status) : undefined))
        .orderBy(desc(agentWorkflowGraphs.updatedAt));
      // Union with in-memory-only records not yet in DB
      const dbIds = new Set(rows.map((r: any) => r.id));
      return [...rows, ...memFiltered.filter((g) => !dbIds.has(g.id))];
    } catch {
      return memFiltered;
    }
  }

  async updateGraph(
    graphId: string,
    tenantId: string,
    updates: { graphName?: string; description?: string; canvasState?: StudioCanvasState; key?: string }
  ): Promise<{ graph?: any; errors: string[] }> {
    const existing = await this.getGraphById(graphId, tenantId);
    if (!existing) return { errors: ["Graph not found"] };

    let dslPayloadJson = existing.dslPayloadJson;
    let dslHash = existing.dslHash;
    const canvasState = updates.canvasState || JSON.parse(existing.canvasStateJson);

    if (updates.canvasState || updates.graphName) {
      const compile = compileCanvasToDsl(canvasState, {
        key: updates.key || existing.id,
        name: updates.graphName || existing.graphName,
        description: updates.description ?? existing.description ?? undefined,
      });
      if (!compile.success || !compile.dsl) return { errors: compile.errors };
      dslPayloadJson = JSON.stringify(compile.dsl);
      dslHash = compile.dslHash || computeDslHash(compile.dsl);
    }

    const nextVersion = Number(existing.graphVersion || 1) + 1;
    const updated = {
      ...existing,
      graphName: updates.graphName || existing.graphName,
      description: updates.description !== undefined ? updates.description : existing.description,
      canvasStateJson: JSON.stringify(canvasState),
      dslPayloadJson,
      dslHash,
      graphVersion: nextVersion,
      updatedAt: new Date().toISOString(),
    };
    this.memoryGraphs.set(graphId, updated);
    try {
      if (db && !this.useMemoryOnly) {
        await db
          .update(agentWorkflowGraphs)
          .set({
            graphName: updated.graphName,
            description: updated.description,
            canvasStateJson: updated.canvasStateJson,
            dslPayloadJson: updated.dslPayloadJson,
            dslHash: updated.dslHash,
            graphVersion: updated.graphVersion,
            updatedAt: updated.updatedAt,
          })
          .where(eq(agentWorkflowGraphs.id, graphId));
      }
    } catch {}
    await this.recordVersion(updated, "auto_save");
    return { graph: updated, errors: [] };
  }

  async deleteGraph(graphId: string, tenantId: string): Promise<boolean> {
    const existing = await this.getGraphById(graphId, tenantId);
    if (!existing) return false;
    this.memoryGraphs.delete(graphId);
    try {
      if (db && !this.useMemoryOnly) {
        await db.delete(agentWorkflowGraphs).where(eq(agentWorkflowGraphs.id, graphId));
      }
    } catch {}
    return true;
  }

  /**
   * Publish: recompile canvas → DSL, then create/update the linked agentic_workflows row.
   */
  async publishGraph(graphId: string, tenantId: string): Promise<{ graph?: any; workflowId?: string; errors: string[] }> {
    const existing = await this.getGraphById(graphId, tenantId);
    if (!existing) return { errors: ["Graph not found"] };

    const canvasState = JSON.parse(existing.canvasStateJson);
    const compile = compileCanvasToDsl(canvasState, {
      key: existing.id,
      name: existing.graphName,
      description: existing.description || undefined,
    });
    if (!compile.success || !compile.dsl) return { errors: compile.errors };

    const workflowId = existing.workflowId || existing.id;
    try {
      if (db && !this.useMemoryOnly) {
        const wfRows = await db
          .select()
          .from(agenticWorkflows)
          .where(and(eq(agenticWorkflows.id, workflowId), eq(agenticWorkflows.institutionId, tenantId)));
        if (wfRows.length > 0) {
          await db
            .update(agenticWorkflows)
            .set({
              name: existing.graphName,
              definitionJson: JSON.stringify(compile.dsl),
              version: (wfRows[0] as any).version + 1,
              updatedAt: new Date().toISOString(),
            })
            .where(eq(agenticWorkflows.id, workflowId));
        } else {
          await db.insert(agenticWorkflows).values({
            id: workflowId,
            institutionId: tenantId,
            name: existing.graphName,
            description: existing.description || "",
            definitionJson: JSON.stringify(compile.dsl),
            version: 1,
            status: "active",
            createdBy: existing.createdBy,
          } as any);
        }
      }
    } catch {}

    const nextVersion = Number(existing.graphVersion || 1) + 1;
    const published = {
      ...existing,
      dslPayloadJson: JSON.stringify(compile.dsl),
      dslHash: compile.dslHash,
      workflowId,
      graphVersion: nextVersion,
      status: "published",
      updatedAt: new Date().toISOString(),
    };
    this.memoryGraphs.set(graphId, published);
    try {
      if (db && !this.useMemoryOnly) {
        await db
          .update(agentWorkflowGraphs)
          .set({
            dslPayloadJson: published.dslPayloadJson,
            dslHash: published.dslHash,
            workflowId,
            graphVersion: published.graphVersion,
            status: "published",
            updatedAt: published.updatedAt,
          })
          .where(eq(agentWorkflowGraphs.id, graphId));
      }
    } catch {}
    await this.recordVersion(published, "publish");
    return { graph: published, workflowId, errors: [] };
  }
}
