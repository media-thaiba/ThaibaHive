import { db } from "@/db";
import { aiAgents, aiAgentCommunications } from "@thaiba/db/schema";
import { eq,  } from "drizzle-orm";

export interface AgentDefinition {
  id: string;
  tenantId: string;
  agentType: "academic_advisor" | "financial_controller" | "compliance_auditor";
  domain: "academics" | "finance" | "compliance";
  name: string;
  capabilities: string[];
  isActive: boolean;
}

export interface InterAgentMessage {
  id?: string;
  tenantId: string;
  correlationId: string;
  senderAgentId: string;
  recipientAgentId: string;
  messageType: string;
  payload: Record<string, unknown>;
  hopCount?: number;
}

export class AgentSwarmOrchestrator {
  private registeredAgents = new Map<string, AgentDefinition>();

  async registerAgent(agent: AgentDefinition): Promise<AgentDefinition> {
    this.registeredAgents.set(agent.id, agent);

    try {
      const existing = await db
        .select()
        .from(aiAgents)
        .where(eq(aiAgents.id, agent.id))
        .get();

      if (!existing) {
        await db.insert(aiAgents).values({
          id: agent.id,
          tenantId: agent.tenantId,
          agentType: agent.agentType,
          domain: agent.domain,
          name: agent.name,
          capabilitiesJson: JSON.stringify(agent.capabilities),
          isActive: agent.isActive,
        }).run();
      }
    } catch {
      // In-memory fallback if DB error
    }

    return agent;
  }

  async getAgent(agentId: string): Promise<AgentDefinition | null> {
    if (this.registeredAgents.has(agentId)) {
      return this.registeredAgents.get(agentId)!;
    }

    try {
      const row = await db.select().from(aiAgents).where(eq(aiAgents.id, agentId)).get();
      if (row) {
        const agent: AgentDefinition = {
          id: row.id,
          tenantId: row.tenantId,
          agentType: row.agentType as AgentDefinition["agentType"],
          domain: row.domain as AgentDefinition["domain"],
          name: row.name,
          capabilities: row.capabilitiesJson ? JSON.parse(row.capabilitiesJson) : [],
          isActive: row.isActive ?? true,
        };
        this.registeredAgents.set(agent.id, agent);
        return agent;
      }
    } catch {
      // Return null if not found
    }

    return null;
  }

  async listAgentsByTenant(tenantId: string): Promise<AgentDefinition[]> {
    const list: AgentDefinition[] = [];
    for (const agent of this.registeredAgents.values()) {
      if (agent.tenantId === tenantId) {
        list.push(agent);
      }
    }

    if (list.length > 0) return list;

    try {
      const rows = await db.select().from(aiAgents).where(eq(aiAgents.tenantId, tenantId)).all();
      return rows.map((r) => ({
        id: r.id,
        tenantId: r.tenantId,
        agentType: r.agentType as AgentDefinition["agentType"],
        domain: r.domain as AgentDefinition["domain"],
        name: r.name,
        capabilities: r.capabilitiesJson ? JSON.parse(r.capabilitiesJson) : [],
        isActive: r.isActive ?? true,
      }));
    } catch {
      return list;
    }
  }

  async dispatchInterAgentMessage(msg: InterAgentMessage): Promise<{ success: boolean; hopCount: number; error?: string }> {
    const hopCount = msg.hopCount ?? 1;

    // Enforce max 3-hop call depth to prevent circular deadlocks
    if (hopCount > 3) {
      return {
        success: false,
        hopCount,
        error: `Max inter-agent hop limit exceeded (${hopCount} > 3)`,
      };
    }

    const messageId = msg.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    try {
      await db.insert(aiAgentCommunications).values({
        id: messageId,
        tenantId: msg.tenantId,
        correlationId: msg.correlationId,
        senderAgentId: msg.senderAgentId,
        recipientAgentId: msg.recipientAgentId,
        messageType: msg.messageType,
        payloadJson: JSON.stringify(msg.payload),
        hopCount,
      }).run();
    } catch {
      // Non-blocking log persistence error fallback
    }

    return {
      success: true,
      hopCount,
    };
  }
}

export const agentSwarmOrchestrator = new AgentSwarmOrchestrator();
