import { AgentDbStore, agentDbStore } from "../../db/agent-store";

export type MemoryScope = "episodic" | "semantic" | "procedural";

export interface AgentMemoryItem {
  id?: string;
  agentId: string;
  institutionId: string;
  scope: MemoryScope;
  content: Record<string, any>;
  importance?: number;
  sourceRef?: string;
  embedding?: string;
  expiresAt?: string;
}

export interface MemoryQueryResult {
  entries: any[];
  totalMatches: number;
}

export class AgentMemoryStore {
  private static instance: AgentMemoryStore;
  private store: AgentDbStore;

  constructor(store?: AgentDbStore) {
    this.store = store || agentDbStore;
  }

  public static getInstance(): AgentMemoryStore {
    if (!AgentMemoryStore.instance) {
      AgentMemoryStore.instance = new AgentMemoryStore();
    }
    return AgentMemoryStore.instance;
  }

  public async remember(item: AgentMemoryItem): Promise<any> {
    return await this.store.createMemoryEntry({
      agentId: item.agentId,
      institutionId: item.institutionId,
      scope: item.scope,
      contentJson: JSON.stringify(item.content),
      importance: item.importance ?? 1.0,
      sourceRef: item.sourceRef,
      embedding: item.embedding,
      expiresAt: item.expiresAt,
    });
  }

  public async recall(options: {
    institutionId: string;
    agentId?: string;
    scope?: MemoryScope;
    queryText?: string;
    minImportance?: number;
    limit?: number;
  }): Promise<MemoryQueryResult> {
    const rawEntries = await this.store.queryMemoryEntries(
      options.institutionId,
      options.agentId,
      options.scope,
      options.queryText
    );

    let filtered = rawEntries;
    if (options.minImportance !== undefined) {
      filtered = filtered.filter((e) => (e.importance ?? 0) >= options.minImportance!);
    }

    // Sort by importance descending
    filtered.sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0));

    const limit = options.limit || 10;
    const entries = filtered.slice(0, limit).map((e) => ({
      ...e,
      content: JSON.parse(e.contentJson || "{}"),
    }));

    return {
      entries,
      totalMatches: filtered.length,
    };
  }

  public async forget(memoryId: string, institutionId: string): Promise<boolean> {
    return await this.store.deleteMemoryEntry(memoryId, institutionId);
  }

  public async pruneExpired(): Promise<number> {
    return await this.store.pruneExpiredMemory();
  }

  public async storeMemory(item: AgentMemoryItem): Promise<any> {
    return this.remember(item);
  }

  public async retrieveRelevantMemories(options: {
    agentId: string;
    tenantId: string;
    query?: string;
    scope?: MemoryScope;
    limit?: number;
  }): Promise<any[]> {
    const res = await this.recall({
      institutionId: options.tenantId,
      agentId: options.agentId,
      scope: options.scope,
      queryText: options.query,
      limit: options.limit,
    });
    return res.entries;
  }
}

export const agentMemoryStore = AgentMemoryStore.getInstance();

