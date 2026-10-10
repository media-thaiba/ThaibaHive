import { db } from "@thaiba/db";
import { agentWorkflowGraphs, agenticWorkflows } from "@thaiba/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { compileCanvasToDsl, computeDslHash, type StudioCanvasState } from "@/lib/workflow-studio/graph-compiler";

export class WorkflowStudioStore {
  private static instance: WorkflowStudioStore;
  public useMemoryOnly: boolean = process.env.NODE_ENV === "test";
  private memoryGraphs: Map<string, any> = new Map();

  public static getInstance(): WorkflowStudioStore {
    if (!WorkflowStudioStore.instance) {
      WorkflowStudioStore.instance = new WorkflowStudioStore();
    }
    return WorkflowStudioStore.instance;
  }

  public clearMemoryStore(): void {
    this.memoryGraphs.clear();
  }

  private nextId(): string {
    return `graph_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
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

    const updated = {
      ...existing,
      graphName: updates.graphName || existing.graphName,
      description: updates.description !== undefined ? updates.description : existing.description,
      canvasStateJson: JSON.stringify(canvasState),
      dslPayloadJson,
      dslHash,
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
            updatedAt: updated.updatedAt,
          })
          .where(eq(agentWorkflowGraphs.id, graphId));
      }
    } catch {}
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

    const published = {
      ...existing,
      dslPayloadJson: JSON.stringify(compile.dsl),
      dslHash: compile.dslHash,
      workflowId,
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
            status: "published",
            updatedAt: published.updatedAt,
          })
          .where(eq(agentWorkflowGraphs.id, graphId));
      }
    } catch {}
    return { graph: published, workflowId, errors: [] };
  }
}
