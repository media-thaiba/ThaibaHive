import { createHash } from "crypto";
import { toolRegistry, ToolRegistry } from "./tool-registry";
import { TenantContext, ToolExecutionContext } from "./contract";
import { agentDbStore, AgentDbStore } from "../../db/agent-store";
import { merkleAuditLedger, MerkleAuditLedger } from "../guardrails/merkle-ledger";

export interface ToolExecutionResult<T = any> {
  toolName: string;
  agentId: string;
  status: "success" | "denied" | "invalid_input" | "invalid_output" | "error";
  output?: T;
  error?: string;
  durationMs: number;
  auditHash?: string;
  traceId?: string;
}

export class ToolExecutor {
  private static instance: ToolExecutor;
  private registry: ToolRegistry;
  private store: AgentDbStore;
  private merkleLedger: MerkleAuditLedger;
  private idempotencyCache: Map<string, any> = new Map(); // key -> result
  private rateLimitMap: Map<string, number[]> = new Map(); // key -> timestamps
  private rateLimitThresholds: Map<string, number> = new Map(); // toolName -> maxPerMinute

  constructor(options?: { registry?: ToolRegistry; store?: AgentDbStore; merkleLedger?: MerkleAuditLedger }) {
    this.registry = options?.registry || toolRegistry;
    this.store = options?.store || agentDbStore;
    this.merkleLedger = options?.merkleLedger || merkleAuditLedger;
  }

  public static getInstance(): ToolExecutor {
    if (!ToolExecutor.instance) {
      ToolExecutor.instance = new ToolExecutor();
    }
    return ToolExecutor.instance;
  }

  public clearIdempotencyCache(): void {
    this.idempotencyCache.clear();
  }

  public clearRateLimits(): void {
    this.rateLimitMap.clear();
    this.rateLimitThresholds.clear();
  }

  public setRateLimit(toolName: string, maxCallsPerMinute: number): void {
    this.rateLimitThresholds.set(toolName, maxCallsPerMinute);
  }

  public async executeTool(
    agentId: string,
    toolName: string,
    rawInput: any,
    tenant: TenantContext
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();

    // 1. Runtime Tenant Assertion
    if (!tenant || !tenant.institutionId) {
      return {
        toolName,
        agentId,
        status: "denied",
        error: "Tenant assertion failed: Missing institutionId in execution context.",
        durationMs: 0,
      };
    }

    // 2. Tool Lookup & Tenancy Allowlist
    const tool = this.registry.getTool(toolName, tenant.institutionId);
    if (!tool) {
      return {
        toolName,
        agentId,
        status: "denied",
        error: `Tool '${toolName}' is not registered or not permitted for tenant '${tenant.institutionId}'.`,
        durationMs: Date.now() - startTime,
      };
    }

    // 3. Rate Limit Check
    const rateKey = `${tenant.institutionId}:${toolName}`;
    const now = Date.now();
    const limit = this.rateLimitThresholds.get(toolName) || 120; // default 120/min
    const windowMs = 60000;
    const history = (this.rateLimitMap.get(rateKey) || []).filter((t) => now - t < windowMs);

    if (history.length >= limit) {
      const errorMsg = `Rate limit exceeded for tool '${toolName}'. Maximum ${limit} calls per minute.`;
      await this.recordAudit(agentId, toolName, rawInput, null, "denied", errorMsg, tenant, Date.now() - startTime);
      return {
        toolName,
        agentId,
        status: "denied",
        error: errorMsg,
        durationMs: Date.now() - startTime,
      };
    }
    history.push(now);
    this.rateLimitMap.set(rateKey, history);

    // 4. RBAC Permission Check
    const hasPermission =
      tenant.permissions.includes("*") ||
      tenant.permissions.includes(tool.requiredPermission);

    if (!hasPermission) {
      await this.recordAudit(agentId, toolName, rawInput, null, "denied", "Insufficient permissions", tenant, Date.now() - startTime);
      return {
        toolName,
        agentId,
        status: "denied",
        error: `Agent '${agentId}' lacks required permission '${tool.requiredPermission}' for tool '${toolName}'.`,
        durationMs: Date.now() - startTime,
      };
    }

    // 5. Idempotency Check
    if (tenant.idempotencyKey) {
      const cacheKey = `${tenant.institutionId}:${toolName}:${tenant.idempotencyKey}`;
      if (this.idempotencyCache.has(cacheKey)) {
        const cached = this.idempotencyCache.get(cacheKey);
        return {
          toolName,
          agentId,
          status: "success",
          output: cached.output,
          auditHash: cached.auditHash,
          durationMs: Date.now() - startTime,
          traceId: tenant.traceId,
        };
      }
    }

    // 5. Input Schema Validation
    const parsedInput = tool.inputSchema.safeParse(rawInput);
    if (!parsedInput.success) {
      const errorMsg = `Input validation error: ${parsedInput.error.issues.map((e) => e.message).join(", ")}`;
      await this.recordAudit(agentId, toolName, rawInput, null, "error", errorMsg, tenant, Date.now() - startTime);
      return {
        toolName,
        agentId,
        status: "invalid_input",
        error: errorMsg,
        durationMs: Date.now() - startTime,
      };
    }

    // 6. Sandboxed Execution
    const executionContext: ToolExecutionContext = {
      tenant,
      toolName,
      invokedAt: new Date().toISOString(),
      idempotencyKey: tenant.idempotencyKey,
    };

    let rawOutput: any;
    try {
      rawOutput = await tool.execute(parsedInput.data, executionContext);
    } catch (err: any) {
      const errorMsg = err?.message || String(err);
      await this.recordAudit(agentId, toolName, rawInput, null, "error", errorMsg, tenant, Date.now() - startTime);
      return {
        toolName,
        agentId,
        status: "error",
        error: errorMsg,
        durationMs: Date.now() - startTime,
      };
    }

    // 7. Output Schema Validation
    const parsedOutput = tool.outputSchema.safeParse(rawOutput);
    if (!parsedOutput.success) {
      const errorMsg = `Output validation error: ${parsedOutput.error.issues.map((e) => e.message).join(", ")}`;
      await this.recordAudit(agentId, toolName, rawInput, null, "error", errorMsg, tenant, Date.now() - startTime);
      return {
        toolName,
        agentId,
        status: "invalid_output",
        error: errorMsg,
        durationMs: Date.now() - startTime,
      };
    }

    const durationMs = Date.now() - startTime;
    const auditRecord = await this.recordAudit(agentId, toolName, parsedInput.data, parsedOutput.data, "success", undefined, tenant, durationMs);

    // Cache idempotency result
    if (tenant.idempotencyKey) {
      const cacheKey = `${tenant.institutionId}:${toolName}:${tenant.idempotencyKey}`;
      this.idempotencyCache.set(cacheKey, {
        output: parsedOutput.data,
        auditHash: auditRecord.auditHash,
      });
    }

    return {
      toolName,
      agentId,
      status: "success",
      output: parsedOutput.data,
      auditHash: auditRecord.auditHash,
      durationMs,
      traceId: tenant.traceId,
    };
  }

  private async recordAudit(
    agentId: string,
    toolName: string,
    input: any,
    output: any,
    status: "success" | "error" | "denied",
    error: string | undefined,
    tenant: TenantContext,
    durationMs: number
  ) {
    const inputHash = createHash("sha256").update(JSON.stringify(input || {})).digest("hex");
    const outputHash = output ? createHash("sha256").update(JSON.stringify(output)).digest("hex") : undefined;

    return await this.merkleLedger.enqueueInvocation(
      {
        agentId,
        toolName,
        institutionId: tenant.institutionId,
        status,
        durationMs,
        inputHash,
        outputHash,
        error,
        traceId: tenant.traceId,
      },
      { immediateFlush: true }
    );
  }
}

export const toolExecutor = ToolExecutor.getInstance();
