import { z } from "zod";

export type ToolRiskLevel = "low" | "medium" | "high" | "critical";
export type ToolType = "read" | "write" | "admin";

export interface TenantContext {
  institutionId: string;
  userId: string;
  userRole: string;
  permissions: string[];
  traceId?: string;
  idempotencyKey?: string;
}

export interface ToolExecutionContext {
  tenant: TenantContext;
  toolName: string;
  invokedAt: string;
  idempotencyKey?: string;
}

export interface ToolCompensationResult {
  success: boolean;
  message?: string;
  error?: string;
  compensatedAt: string;
}

export interface AgentTool<TInput = any, TOutput = any> {
  name: string;
  description: string;
  domain: "academic" | "finance" | "security" | "facilities" | "hr" | "system";
  type: ToolType;
  requiredPermission: string;
  riskLevel: ToolRiskLevel;
  inputSchema: z.ZodType<TInput>;
  outputSchema: z.ZodType<TOutput>;
  
  // Execution handler
  execute(input: TInput, context: ToolExecutionContext): Promise<TOutput>;
  
  // Mandatory saga compensator for write/admin mutating tools
  compensate?(input: TInput, output: TOutput, context: ToolExecutionContext): Promise<ToolCompensationResult>;
}

export function validateToolContract(tool: AgentTool): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!tool.name || typeof tool.name !== "string") {
    errors.push("Tool must have a valid string name.");
  }
  if (!tool.domain) {
    errors.push("Tool must declare a domain.");
  }
  if (!tool.requiredPermission) {
    errors.push("Tool must declare a requiredPermission.");
  }
  if (!tool.inputSchema || !(tool.inputSchema instanceof z.ZodType)) {
    errors.push("Tool must have a valid Zod inputSchema.");
  }
  if (!tool.outputSchema || !(tool.outputSchema instanceof z.ZodType)) {
    errors.push("Tool must have a valid Zod outputSchema.");
  }

  // Saga requirement: all write and admin tools MUST have a compensator defined
  if ((tool.type === "write" || tool.type === "admin") && typeof tool.compensate !== "function") {
    errors.push(`Mutating tool '${tool.name}' of type '${tool.type}' must provide a 'compensate' saga handler.`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
