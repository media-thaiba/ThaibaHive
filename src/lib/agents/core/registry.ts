import { AgentMetadata, AgentStatus, AgentDomain } from "./types";

export class AgentRegistry {
  private static instance: AgentRegistry;
  private agents: Map<string, AgentMetadata> = new Map();

  private constructor() {}

  public static getInstance(): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry();
      AgentRegistry.instance.bootstrapDefaults();
    }
    return AgentRegistry.instance;
  }

  public bootstrapDefaults(): void {
    if (this.agents.size > 0) return;

    this.register("academic-agent", "Academic Orchestration & SIS Coordinator", "1.0.0", {
      domain: "academic",
      capabilities: ["attendance_reconciliation", "timetable_generation", "grade_posting"],
      permissionScopes: ["agent:workflows:view", "agent:workflows:execute"],
      institutionId: "global",
    });

    this.register("finance-agent", "Finance & Fee Reconciliation Specialist", "1.0.0", {
      domain: "finance",
      capabilities: ["fee_reconciliation", "scholarship_triage", "ledger_audit"],
      permissionScopes: ["agent:workflows:view", "agent:workflows:execute", "agent:workflows:approve"],
      institutionId: "global",
    });

    this.register("security-agent", "SafeCampus Perimeter & Incident Responder", "1.0.0", {
      domain: "security",
      capabilities: ["threat_triage", "lockdown_coordination", "perimeter_patrol"],
      permissionScopes: ["agent:workflows:view", "agent:workflows:execute", "agent:workflows:approve"],
      institutionId: "global",
    });

    this.register("facilities-agent", "Campus Facilities, Energy & IoT Operations Coordinator", "1.0.0", {
      domain: "facilities",
      capabilities: ["hvac_optimization", "work_order_dispatch", "energy_telemetry"],
      permissionScopes: ["agent:workflows:view", "agent:workflows:execute"],
      institutionId: "global",
    });

    this.register("hr-agent", "Human Resources & Faculty Operations Specialist", "1.0.0", {
      domain: "hr",
      capabilities: ["onboarding_provisioning", "leave_balance_computation", "workload_compliance"],
      permissionScopes: ["agent:workflows:view", "agent:workflows:execute"],
      institutionId: "global",
    });
  }

  public register(
    id: string,
    role: string,
    version: string,
    options?: {
      institutionId?: string;
      domain?: AgentDomain;
      description?: string;
      capabilities?: string[];
      permissionScopes?: string[];
      maxConcurrency?: number;
    }
  ): void {
    const agent: AgentMetadata = {
      id,
      role,
      version,
      status: "idle",
      lastHeartbeat: new Date().toISOString(),
      institutionId: options?.institutionId || "global",
      domain: options?.domain,
      description: options?.description,
      capabilities: options?.capabilities || [],
      permissionScopes: options?.permissionScopes || [],
      maxConcurrency: options?.maxConcurrency || 5,
      currentLoad: 0,
    };
    this.agents.set(id, agent);
  }

  public registerAgent(agent: AgentMetadata): void {
    this.agents.set(agent.id, {
      ...agent,
      institutionId: agent.institutionId || "global",
      capabilities: agent.capabilities || [],
      permissionScopes: agent.permissionScopes || [],
      lastHeartbeat: agent.lastHeartbeat || new Date().toISOString(),
    });
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

  public adjustLoad(id: string, delta: number): void {
    const agent = this.agents.get(id);
    if (agent) {
      agent.currentLoad = Math.max(0, (agent.currentLoad || 0) + delta);
      this.agents.set(id, agent);
    }
  }

  public getAgent(id: string, institutionId?: string): AgentMetadata | undefined {
    const agent = this.agents.get(id);
    if (!agent) return undefined;
    if (institutionId && agent.institutionId !== "global" && agent.institutionId !== institutionId) {
      return undefined;
    }
    return agent;
  }

  public listAgents(filters?: {
    institutionId?: string;
    domain?: AgentDomain;
    capability?: string;
    status?: AgentStatus;
  } | string): AgentMetadata[] {
    const filterObj = typeof filters === "string" ? { institutionId: filters } : (filters || {});
    return Array.from(this.agents.values()).filter((agent) => {
      if (
        filterObj.institutionId &&
        filterObj.institutionId !== "global" &&
        agent.institutionId !== "global" &&
        agent.institutionId !== filterObj.institutionId
      ) {
        return false;
      }
      if (filterObj.domain && agent.domain !== filterObj.domain) {
        return false;
      }
      if (filterObj.status && agent.status !== filterObj.status) {
        return false;
      }
      if (filterObj.capability && !agent.capabilities?.includes(filterObj.capability)) {
        return false;
      }
      return true;
    });
  }

  public findAgentsByCapability(capability: string, institutionId?: string): AgentMetadata[] {
    return this.listAgents({ capability, institutionId });
  }

  public unregister(id: string): void {
    this.agents.delete(id);
  }

  public clear(): void {
    this.agents.clear();
  }
}

