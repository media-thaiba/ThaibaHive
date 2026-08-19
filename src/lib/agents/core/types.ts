export type AgentStatus = "idle" | "active" | "remediating" | "unhealthy";

export interface AgentMetadata {
  id: string;
  role: string;
  version: string;
  status: AgentStatus;
  lastHeartbeat: string; // ISO String
}

export interface AgentMessage {
  id: string;
  senderId: string;
  recipientId: string;
  topic: string;
  payload: Record<string, unknown>;
  priority: "high" | "normal" | "low";
  timestamp: string; // ISO String
}

export type MessageHandler = (message: AgentMessage) => Promise<void> | void;

export interface TaskConfig {
  id: string;
  cronExpression?: string; // Standard cron or fixed millisecond interval
  intervalMs?: number;
  runOnce?: boolean;
}
