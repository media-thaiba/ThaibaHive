import { AgentMetadata, AgentStatus } from "./types";

export class AgentRegistry {
  private static instance: AgentRegistry;
  private agents: Map<string, AgentMetadata> = new Map();

  private constructor() {}

  public static getInstance(): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry();
    }
    return AgentRegistry.instance;
  }

  public register(id: string, role: string, version: string): void {
    const agent: AgentMetadata = {
      id,
      role,
      version,
      status: "idle",
      lastHeartbeat: new Date().toISOString(),
    };
    this.agents.set(id, agent);
  }

  public heartbeat(id: string): void {
    const agent = this.agents.get(id);
    if (agent) {
      agent.lastHeartbeat = new Date().toISOString();
      this.agents.set(id, agent);
    }
  }

  public updateStatus(id: string, status: AgentStatus): void {
    const agent = this.agents.get(id);
    if (agent) {
      agent.status = status;
      agent.lastHeartbeat = new Date().toISOString();
      this.agents.set(id, agent);
    }
  }

  public getAgent(id: string): AgentMetadata | undefined {
    return this.agents.get(id);
  }

  public listAgents(): AgentMetadata[] {
    return Array.from(this.agents.values());
  }

  public unregister(id: string): void {
    this.agents.delete(id);
  }

  public clear(): void {
    this.agents.clear();
  }
}
