import { db } from '@thaiba/db';
import {
  agenticWorkflows,
  agenticWorkflowRuns,
  agenticWorkflowSteps,
  agentApprovalGates,
  agentMemoryEntries,
  agentToolInvocations,
  agentOutboxMessages,
} from '@thaiba/db/schema';

type OptionalId<T> = Omit<T, 'id'> & { id?: string };

export interface InMemoryAgentStore {
  workflows: Map<string, any>;
  workflowRuns: Map<string, any>;
  workflowSteps: Map<string, any>;
  approvalGates: Map<string, any>;
  memoryEntries: Map<string, any>;
  toolInvocations: Map<string, any>;
  outboxMessages: Map<string, any>;
}

export class AgentDbStore {
  private static instance: AgentDbStore;
  public useMemoryOnly: boolean = process.env.NODE_ENV === 'test';
  private memoryStore: InMemoryAgentStore = {
    workflows: new Map(),
    workflowRuns: new Map(),
    workflowSteps: new Map(),
    approvalGates: new Map(),
    memoryEntries: new Map(),
    toolInvocations: new Map(),
    outboxMessages: new Map(),
  };

  public static getInstance(): AgentDbStore {
    if (!AgentDbStore.instance) {
      AgentDbStore.instance = new AgentDbStore();
    }
    return AgentDbStore.instance;
  }

  public clearMemoryStore(): void {
    this.memoryStore.workflows.clear();
    this.memoryStore.workflowRuns.clear();
    this.memoryStore.workflowSteps.clear();
    this.memoryStore.approvalGates.clear();
    this.memoryStore.memoryEntries.clear();
    this.memoryStore.toolInvocations.clear();
    this.memoryStore.outboxMessages.clear();
  }

  // ─── Workflows ───
  async createWorkflow(data: OptionalId<typeof agenticWorkflows.$inferInsert>): Promise<any> {
    const record = {
      ...data,
      id: data.id || `wf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      version: data.version ?? 1,
      status: data.status || 'active',
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    this.memoryStore.workflows.set(record.id, record);
    try {
      if (db) await db.insert(agenticWorkflows).values(record as any);
    } catch {}
    return record;
  }

  async getWorkflowById(workflowId: string, tenantId: string = 'global'): Promise<any | null> {
    const item = this.memoryStore.workflows.get(workflowId);
    if (item && (item.institutionId === tenantId || tenantId === 'global')) {
      return item;
    }
    return null;
  }

  async listWorkflows(tenantId: string = 'global', status?: string): Promise<any[]> {
    return Array.from(this.memoryStore.workflows.values()).filter(
      (w) =>
        (tenantId === 'global' || w.institutionId === tenantId) &&
        (!status || w.status === status)
    );
  }

  async updateWorkflow(workflowId: string, updates: Partial<typeof agenticWorkflows.$inferInsert>, tenantId: string = 'global'): Promise<any | null> {
    const existing = await this.getWorkflowById(workflowId, tenantId);
    if (!existing) return null;
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.memoryStore.workflows.set(workflowId, updated);
    return updated;
  }

  async deleteWorkflow(workflowId: string, tenantId: string = 'global'): Promise<boolean> {
    const existing = await this.getWorkflowById(workflowId, tenantId);
    if (!existing) return false;
    this.memoryStore.workflows.delete(workflowId);
    return true;
  }

  // ─── Workflow Runs ───
  async createWorkflowRun(data: OptionalId<typeof agenticWorkflowRuns.$inferInsert> & { workflowKey?: string; context?: any }): Promise<any> {
    const wfId = (data as any).workflowId || (data as any).workflowKey || 'unknown_wf';
    const record = {
      ...data,
      workflowId: wfId,
      workflowKey: wfId,
      contextJson: data.contextJson || (data.context ? JSON.stringify(data.context) : undefined),
      id: data.id || `run_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      status: data.status || 'pending',
      triggerType: data.triggerType || 'manual',
      triggeredBy: data.triggeredBy || 'system',
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    this.memoryStore.workflowRuns.set(record.id, record);
    try {
      if (db) await db.insert(agenticWorkflowRuns).values(record as any);
    } catch {}
    return record;
  }

  async getWorkflowRunById(runId: string, tenantId: string = 'global'): Promise<any | null> {
    const item = this.memoryStore.workflowRuns.get(runId);
    if (item && (item.institutionId === tenantId || tenantId === 'global')) {
      return item;
    }
    return null;
  }

  async listWorkflowRuns(tenantId: string = 'global', workflowId?: string, status?: string): Promise<any[]> {
    return Array.from(this.memoryStore.workflowRuns.values()).filter(
      (r) =>
        (tenantId === 'global' || r.institutionId === tenantId) &&
        (!workflowId || r.workflowId === workflowId || r.workflowKey === workflowId) &&
        (!status || r.status === status)
    );
  }

  async updateWorkflowRun(runId: string, updates: Partial<typeof agenticWorkflowRuns.$inferInsert>, tenantId: string = 'global'): Promise<any | null> {
    const existing = await this.getWorkflowRunById(runId, tenantId);
    if (!existing) return null;
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.memoryStore.workflowRuns.set(runId, updated);
    return updated;
  }

  // ─── Workflow Steps ───
  async createWorkflowStep(data: OptionalId<typeof agenticWorkflowSteps.$inferInsert> & { input?: any; output?: any }): Promise<any> {
    const record = {
      ...data,
      id: data.id || `step_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      inputJson: data.inputJson || (data.input ? JSON.stringify(data.input) : undefined),
      outputJson: data.outputJson || (data.output ? JSON.stringify(data.output) : undefined),
      input: data.input,
      output: data.output,
      status: data.status || 'pending',
      attempt: data.attempt ?? 0,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    this.memoryStore.workflowSteps.set(record.id, record);
    try {
      if (db) await db.insert(agenticWorkflowSteps).values(record as any);
    } catch {}
    return record;
  }

  async getWorkflowStepById(stepId: string, tenantId: string = 'global'): Promise<any | null> {
    const item = this.memoryStore.workflowSteps.get(stepId);
    if (item && (item.institutionId === tenantId || tenantId === 'global')) {
      return item;
    }
    return null;
  }

  async listWorkflowStepsByRun(runId: string, tenantId: string = 'global'): Promise<any[]> {
    return Array.from(this.memoryStore.workflowSteps.values()).filter(
      (s) => (tenantId === 'global' || s.institutionId === tenantId) && s.runId === runId
    );
  }

  async listWorkflowSteps(runId: string, tenantId: string = 'global'): Promise<any[]> {
    return this.listWorkflowStepsByRun(runId, tenantId);
  }


  async updateWorkflowStep(stepId: string, updates: Partial<typeof agenticWorkflowSteps.$inferInsert>, tenantId: string = 'global'): Promise<any | null> {
    const existing = await this.getWorkflowStepById(stepId, tenantId);
    if (!existing) return null;
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.memoryStore.workflowSteps.set(stepId, updated);
    return updated;
  }

  // ─── Approval Gates ───
  async createApprovalGate(data: OptionalId<typeof agentApprovalGates.$inferInsert>): Promise<any> {
    const record = {
      ...data,
      id: data.id || `gate_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      requiredPermission: data.requiredPermission || 'agent:workflows:approve',
      severity: data.severity || 'medium',
      status: data.status || 'pending',
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    this.memoryStore.approvalGates.set(record.id, record);
    try {
      if (db) await db.insert(agentApprovalGates).values(record as any);
    } catch {}
    return record;
  }

  async getApprovalGateById(gateId: string, tenantId: string = 'global'): Promise<any | null> {
    const item = this.memoryStore.approvalGates.get(gateId);
    if (item && (item.institutionId === tenantId || tenantId === 'global')) {
      return item;
    }
    return null;
  }

  async listApprovalGates(tenantId: string = 'global', runId?: string, status?: string): Promise<any[]> {
    return Array.from(this.memoryStore.approvalGates.values()).filter(
      (g) =>
        (tenantId === 'global' || g.institutionId === tenantId) &&
        (!runId || g.runId === runId) &&
        (!status || g.status === status)
    );
  }

  async updateApprovalGate(gateId: string, updates: Partial<typeof agentApprovalGates.$inferInsert>, tenantId: string = 'global'): Promise<any | null> {
    const existing = await this.getApprovalGateById(gateId, tenantId);
    if (!existing) return null;
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.memoryStore.approvalGates.set(gateId, updated);
    return updated;
  }

  // ─── Memory Entries ───
  async createMemoryEntry(data: OptionalId<typeof agentMemoryEntries.$inferInsert>): Promise<any> {
    const record = {
      ...data,
      id: data.id || `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      scope: data.scope || 'episodic',
      importance: data.importance ?? 1.0,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    this.memoryStore.memoryEntries.set(record.id, record);
    try {
      if (db) await db.insert(agentMemoryEntries).values(record as any);
    } catch {}
    return record;
  }

  async getMemoryEntryById(memoryId: string, tenantId: string = 'global'): Promise<any | null> {
    const item = this.memoryStore.memoryEntries.get(memoryId);
    if (item && (item.institutionId === tenantId || tenantId === 'global')) {
      return item;
    }
    return null;
  }

  async queryMemoryEntries(tenantId: string = 'global', agentId?: string, scope?: string, queryText?: string): Promise<any[]> {
    return Array.from(this.memoryStore.memoryEntries.values()).filter((m) => {
      if (tenantId !== 'global' && m.institutionId !== tenantId) return false;
      if (agentId && m.agentId !== agentId) return false;
      if (scope && m.scope !== scope) return false;
      if (queryText) {
        const text = (m.contentJson || '').toLowerCase();
        if (!text.includes(queryText.toLowerCase())) return false;
      }
      return true;
    });
  }

  async listMemoryEntries(agentId: string, tenantId: string = 'global', limit: number = 20): Promise<any[]> {
    const entries = await this.queryMemoryEntries(tenantId, agentId);
    return entries.slice(0, limit);
  }


  async deleteMemoryEntry(memoryId: string, tenantId: string = 'global'): Promise<boolean> {
    const existing = await this.getMemoryEntryById(memoryId, tenantId);
    if (!existing) return false;
    this.memoryStore.memoryEntries.delete(memoryId);
    return true;
  }

  async pruneExpiredMemory(now: string = new Date().toISOString()): Promise<number> {
    let pruned = 0;
    for (const [id, entry] of this.memoryStore.memoryEntries.entries()) {
      if (entry.expiresAt && entry.expiresAt < now) {
        this.memoryStore.memoryEntries.delete(id);
        pruned++;
      }
    }
    return pruned;
  }

  // ─── Tool Invocations & Merkle Chain ───
  async recordToolInvocation(data: OptionalId<typeof agentToolInvocations.$inferInsert>): Promise<any> {
    const record = {
      ...data,
      id: data.id || `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      status: data.status,
      durationMs: data.durationMs ?? 0,
      createdAt: data.createdAt || new Date().toISOString(),
    };
    this.memoryStore.toolInvocations.set(record.id, record);
    try {
      if (db && !this.useMemoryOnly) await db.insert(agentToolInvocations).values(record as any);
    } catch {}
    return record;
  }

  async listToolInvocations(tenantId: string = 'global', agentId?: string, toolName?: string): Promise<any[]> {
    if (this.memoryStore.toolInvocations.size === 0 && db && !this.useMemoryOnly) {
      try {
        const rows = await db.select().from(agentToolInvocations).all();
        for (const row of rows) {
          this.memoryStore.toolInvocations.set(row.id, row);
        }
      } catch {}
    }
    return Array.from(this.memoryStore.toolInvocations.values()).filter(
      (inv) =>
        (tenantId === 'global' || inv.institutionId === tenantId) &&
        (!agentId || inv.agentId === agentId) &&
        (!toolName || inv.toolName === toolName)
    );
  }

  async getLatestAuditHash(tenantId: string = 'global'): Promise<string> {
    const invocations = await this.listToolInvocations(tenantId);
    if (invocations.length === 0) return 'GENESIS_HASH_000000000000000000000000000000000000000000000000000000000000';
    return invocations[invocations.length - 1].auditHash;
  }

  // ─── Outbox Messages ───
  async enqueueMessage(data: OptionalId<typeof agentOutboxMessages.$inferInsert>): Promise<any> {
    const record = {
      ...data,
      id: data.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      priority: data.priority ?? 0,
      status: data.status || 'pending',
      attempts: data.attempts ?? 0,
      maxAttempts: data.maxAttempts ?? 3,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    this.memoryStore.outboxMessages.set(record.id, record);
    try {
      if (db) await db.insert(agentOutboxMessages).values(record as any);
    } catch {}
    return record;
  }

  async dequeuePendingMessages(tenantId: string = 'global', limit: number = 10): Promise<any[]> {
    const now = new Date().toISOString();
    const pending = Array.from(this.memoryStore.outboxMessages.values())
      .filter(
        (m) =>
          (tenantId === 'global' || m.institutionId === tenantId) &&
          m.status === 'pending' &&
          (!m.scheduledFor || m.scheduledFor <= now)
      )
      .sort((a, b) => b.priority - a.priority || (a.createdAt > b.createdAt ? 1 : -1))
      .slice(0, limit);

    for (const msg of pending) {
      msg.status = 'processing';
      msg.attempts += 1;
      msg.updatedAt = new Date().toISOString();
      this.memoryStore.outboxMessages.set(msg.id, msg);
    }
    return pending;
  }

  async updateMessageStatus(messageId: string, status: string, error?: string, tenantId: string = 'global'): Promise<any | null> {
    const msg = this.memoryStore.outboxMessages.get(messageId);
    if (!msg || (tenantId !== 'global' && msg.institutionId !== tenantId)) return null;
    msg.status = status;
    if (error) msg.lastError = error;
    if (status === 'delivered') msg.deliveredAt = new Date().toISOString();
    msg.updatedAt = new Date().toISOString();
    this.memoryStore.outboxMessages.set(messageId, msg);
    return msg;
  }

  async listOutboxMessages(tenantId: string = 'global', status?: string): Promise<any[]> {
    return Array.from(this.memoryStore.outboxMessages.values()).filter(
      (m) =>
        (tenantId === 'global' || m.institutionId === tenantId) &&
        (!status || m.status === status)
    );
  }
}

export const agentDbStore = AgentDbStore.getInstance();
