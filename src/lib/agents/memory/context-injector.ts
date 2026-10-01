import { AgentMemoryStore, agentMemoryStore } from "./memory-store";

export interface ContextPacket {
  agentId: string;
  institutionId: string;
  episodicContext: string[];
  semanticContext: string[];
  injectedPromptSection: string;
}

export class ContextInjector {
  private memoryStore: AgentMemoryStore;

  constructor(memoryStore?: AgentMemoryStore) {
    this.memoryStore = memoryStore || agentMemoryStore;
  }

  public async buildContextPacket(options: {
    agentId: string;
    institutionId: string;
    currentGoal: string;
    queryKeywords?: string;
  }): Promise<ContextPacket> {
    const [episodicRes, semanticRes] = await Promise.all([
      this.memoryStore.recall({
        institutionId: options.institutionId,
        agentId: options.agentId,
        scope: "episodic",
        queryText: options.queryKeywords,
        limit: 5,
      }),
      this.memoryStore.recall({
        institutionId: options.institutionId,
        agentId: options.agentId,
        scope: "semantic",
        queryText: options.queryKeywords,
        limit: 3,
      }),
    ]);

    const episodicContext = episodicRes.entries.map(
      (e) => `[Episodic - ${e.createdAt}]: ${JSON.stringify(e.content)}`
    );

    const semanticContext = semanticRes.entries.map(
      (e) => `[Semantic Fact]: ${JSON.stringify(e.content)}`
    );

    const injectedLines: string[] = [];
    if (semanticContext.length > 0) {
      injectedLines.push("### Relevant Institutional Knowledge & Policies:");
      injectedLines.push(...semanticContext);
    }
    if (episodicContext.length > 0) {
      injectedLines.push("### Recent Relevant Agent History:");
      injectedLines.push(...episodicContext);
    }

    return {
      agentId: options.agentId,
      institutionId: options.institutionId,
      episodicContext,
      semanticContext,
      injectedPromptSection: injectedLines.join("\n"),
    };
  }
}

export const contextInjector = new ContextInjector();
