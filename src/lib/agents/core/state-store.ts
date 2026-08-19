import { db } from "@thaiba/db";
import { agentRegistry, agentLogs, agentDecisions } from "@thaiba/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { AgentStatus } from "./types";

export class AgentStateStore {
  private static instance: AgentStateStore;

  private constructor() {}

  public static getInstance(): AgentStateStore {
    if (!AgentStateStore.instance) {
      AgentStateStore.instance = new AgentStateStore();
    }
    return AgentStateStore.instance;
  }

  public async saveAgent(id: string, role: string, version: string, status: AgentStatus): Promise<void> {
    const timestamp = new Date().toISOString();
    
    // Check if agent exists
    const existing = await db
      .select()
      .from(agentRegistry)
      .where(eq(agentRegistry.id, id))
      .get();

    if (existing) {
      await db
        .update(agentRegistry)
        .set({
          status,
          lastHeartbeat: timestamp,
        })
        .where(eq(agentRegistry.id, id))
        .run();
    } else {
      await db
        .insert(agentRegistry)
        .values({
          id,
          role,
          version,
          status,
          lastHeartbeat: timestamp,
          createdAt: timestamp,
        })
        .run();
    }
  }

  public async updateHeartbeat(id: string): Promise<void> {
    const timestamp = new Date().toISOString();
    await db
      .update(agentRegistry)
      .set({
        lastHeartbeat: timestamp,
      })
      .where(eq(agentRegistry.id, id))
      .run();
  }

  public async updateStatus(id: string, status: AgentStatus): Promise<void> {
    const timestamp = new Date().toISOString();
    await db
      .update(agentRegistry)
      .set({
        status,
        lastHeartbeat: timestamp,
      })
      .where(eq(agentRegistry.id, id))
      .run();
  }

  public async log(agentId: string, logLevel: "info" | "warn" | "error" | "debug", message: string): Promise<void> {
    const timestamp = new Date().toISOString();
    await db
      .insert(agentLogs)
      .values({
        id: randomUUID(),
        agentId,
        logLevel,
        message,
        timestamp,
      })
      .run();
  }

  public async logDecision(
    agentId: string,
    targetAsset: string,
    severity: "critical" | "high" | "medium" | "low",
    decision: string,
    actionStatus: "pending" | "approved" | "rejected" | "success" | "failed",
    rollbackState?: string
  ): Promise<string> {
    const id = randomUUID();
    const timestamp = new Date().toISOString();
    await db
      .insert(agentDecisions)
      .values({
        id,
        agentId,
        targetAsset,
        severity,
        decision,
        actionStatus,
        rollbackState: rollbackState || null,
        createdAt: timestamp,
      })
      .run();
    return id;
  }

  public async updateDecisionStatus(
    decisionId: string,
    actionStatus: "pending" | "approved" | "rejected" | "success" | "failed",
    rollbackState?: string
  ): Promise<void> {
    const updatePayload: Partial<typeof agentDecisions.$inferInsert> = {
      actionStatus,
    };
    if (rollbackState !== undefined) {
      updatePayload.rollbackState = rollbackState;
    }
    
    await db
      .update(agentDecisions)
      .set(updatePayload)
      .where(eq(agentDecisions.id, decisionId))
      .run();
  }

  public async getDecision(decisionId: string) {
    return db
      .select()
      .from(agentDecisions)
      .where(eq(agentDecisions.id, decisionId))
      .get();
  }
}
