export type AgentStatus = "idle" | "active" | "remediating" | "unhealthy" | "paused";

export type AgentDomain = "academic" | "finance" | "security" | "facilities" | "hr" | "system";

export interface AgentCapability {
  id: string;
  name: string;
  description: string;
  domain: AgentDomain;
  requiredPermissions: string[];
}

export interface ToolPermissionScope {
  toolName: string;
  permission: string;
  riskLevel: "low" | "medium" | "high" | "critical";
}

export interface AgentMetadata {
  id: string;
  role: string;
  version: string;
  status: AgentStatus;
  lastHeartbeat: string; // ISO String
  institutionId?: string; // Tenant isolation (default 'global')
  domain?: AgentDomain;
  description?: string;
  capabilities?: string[]; // List of capability IDs
  permissionScopes?: string[]; // Allowed permissions
  maxConcurrency?: number;
  currentLoad?: number;
}

export interface AgentMessage {
  id: string;
  senderId: string;
  recipientId: string;
  topic: string;
  payload: Record<string, unknown>;
  priority: "high" | "normal" | "low" | "critical";
  timestamp: string; // ISO String
  institutionId?: string;
  traceId?: string;
  attempts?: number;
}

export type MessageHandler = (message: AgentMessage) => Promise<void> | void;

export interface TaskConfig {
  id: string;
  cronExpression?: string; // Standard cron or fixed millisecond interval
  intervalMs?: number;
  runOnce?: boolean;
}

