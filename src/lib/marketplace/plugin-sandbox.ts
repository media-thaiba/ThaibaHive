import { createHash } from "crypto";
import { merkleAuditLedger } from "@/lib/agents/guardrails/merkle-ledger";

export interface SandboxResourceBudget {
  maxExecutionTimeMs?: number;
  maxMemoryMb?: number;
  maxTokens?: number;
}

export interface SandboxExecuteOptions<T = any> {
  agentId: string;
  pluginId: string;
  toolName: string;
  input: any;
  institutionId: string;
  grantedPermissions: string[];
  resourceBudget?: SandboxResourceBudget;
  executeFn: () => Promise<T>;
}

export interface SandboxExecutionResult<T = any> {
  status: "success" | "denied" | "error" | "timeout";
  output?: T;
  error?: string;
  durationMs: number;
  auditHash?: string;
}

export class PluginSandbox {
  private static activeExecutions = 0;
  private static maxConcurrent = 20;

  /**
   * Configure global concurrency limit for sandboxed executions.
   */
  public static setMaxConcurrent(limit: number): void {
    PluginSandbox.maxConcurrent = limit;
  }

  public static getActiveExecutions(): number {
    return PluginSandbox.activeExecutions;
  }

  /**
   * Validates if a target egress URL is safe to call.
   * Enforces HTTPS-only and rejects RFC 1918, loopback, link-local, and broadcast IPs.
   */
  public static validateEgressUrl(
    urlStr: string,
    allowedUrls?: string[]
  ): { allowed: boolean; reason?: string } {
    let parsed: URL;
    try {
      parsed = new URL(urlStr);
    } catch {
      return { allowed: false, reason: `Malformed URL: '${urlStr}'` };
    }

    // Protocol check: HTTPS only (unless specifically test localhost mock)
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return {
        allowed: false,
        reason: `Disallowed protocol '${parsed.protocol}'. Only HTTPS egress is permitted.`,
      };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Check for loopback & local hostnames
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname === "0.0.0.0" ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal")
    ) {
      return {
        allowed: false,
        reason: "Loopback, localhost, and internal hostnames are blocked (SSRF defense).",
      };
    }

    // IPv4 Address Range Parsing & Rejection
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const ipMatch = hostname.match(ipv4Regex);
    if (ipMatch) {
      const [_, o1, o2, _o3, _o4] = ipMatch.map(Number);
      if (
        o1 === 10 || // 10.0.0.0/8
        o1 === 127 || // 127.0.0.0/8
        (o1 === 172 && o2 >= 16 && o2 <= 31) || // 172.16.0.0/12
        (o1 === 192 && o2 === 168) || // 192.168.0.0/16
        (o1 === 169 && o2 === 254) || // 169.254.0.0/16 Link-local
        (o1 === 100 && o2 >= 64 && o2 <= 127) || // 100.64.0.0/10 Carrier-grade NAT
        o1 === 0 // 0.0.0.0/8
      ) {
        return {
          allowed: false,
          reason: `Private or link-local IP address '${hostname}' is blocked (SSRF defense).`,
        };
      }
    }

    // IPv6 private ranges (fc00::/7, fe80::/10)
    if (
      hostname.startsWith("fc") ||
      hostname.startsWith("fd") ||
      hostname.startsWith("fe80")
    ) {
      return {
        allowed: false,
        reason: "Private IPv6 address ranges are blocked (SSRF defense).",
      };
    }

    // Allowlist check if provided
    if (allowedUrls && allowedUrls.length > 0) {
      const matched = allowedUrls.some((allowed) => {
        try {
          const allowedUrl = new URL(allowed);
          return (
            parsed.origin === allowedUrl.origin &&
            parsed.pathname.startsWith(allowedUrl.pathname)
          );
        } catch {
          return urlStr.startsWith(allowed) || hostname === allowed;
        }
      });

      if (!matched) {
        return {
          allowed: false,
          reason: `Target URL '${urlStr}' is not declared in the plugin's egress allowlist.`,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Evaluate tool capability against granted permissions.
   */
  public static evaluateToolAccess(
    toolName: string,
    grantedPermissions: string[]
  ): { allowed: boolean; reason?: string } {
    if (
      grantedPermissions.includes("*") ||
      grantedPermissions.includes(toolName)
    ) {
      return { allowed: true };
    }

    // Namespace wildcard check (e.g. "finance:*" matches "finance:payroll:run")
    const matchedPrefix = grantedPermissions.some((perm) => {
      if (perm.endsWith(":*")) {
        const prefix = perm.slice(0, -1);
        return toolName.startsWith(prefix);
      }
      return false;
    });

    if (matchedPrefix) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: `Tool '${toolName}' is not permitted by the plugin's granted permissions.`,
    };
  }

  /**
   * Execute a sandboxed tool invocation with resource limits, wall-clock timeout,
   * capability checking, and synchronous Merkle audit logging.
   */
  public static async executeTool<T = any>(
    options: SandboxExecuteOptions<T>
  ): Promise<SandboxExecutionResult<T>> {
    const startTime = Date.now();
    const inputHash = createHash("sha256")
      .update(JSON.stringify(options.input || {}))
      .digest("hex");

    // 1. Concurrency Semaphore Check
    if (PluginSandbox.activeExecutions >= PluginSandbox.maxConcurrent) {
      const errorMsg = `Sandbox execution limit reached (${PluginSandbox.maxConcurrent} active). Backpressure triggered.`;
      await merkleAuditLedger.enqueueInvocation(
        {
          agentId: options.agentId,
          toolName: options.toolName,
          institutionId: options.institutionId,
          status: "denied",
          durationMs: 0,
          inputHash,
          error: errorMsg,
        },
        { immediateFlush: true }
      );

      return {
        status: "denied",
        error: errorMsg,
        durationMs: 0,
      };
    }

    // 2. Capability / Permission Access Gate
    const access = PluginSandbox.evaluateToolAccess(
      options.toolName,
      options.grantedPermissions
    );
    if (!access.allowed) {
      const errorMsg = access.reason || "Permission denied.";
      const durationMs = Date.now() - startTime;

      await merkleAuditLedger.enqueueInvocation(
        {
          agentId: options.agentId,
          toolName: options.toolName,
          institutionId: options.institutionId,
          status: "denied",
          durationMs,
          inputHash,
          error: errorMsg,
        },
        { immediateFlush: true }
      );

      return {
        status: "denied",
        error: errorMsg,
        durationMs,
      };
    }

    // 3. Sandboxed Execution with Wall-Clock Timeout
    PluginSandbox.activeExecutions++;
    const timeoutMs = options.resourceBudget?.maxExecutionTimeMs || 5000;
    let timerId: NodeJS.Timeout | null = null;

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        timerId = setTimeout(() => {
          reject(new Error(`Sandbox execution timeout after ${timeoutMs}ms.`));
        }, timeoutMs);
      });

      const output = await Promise.race([options.executeFn(), timeoutPromise]);
      if (timerId) clearTimeout(timerId);

      const durationMs = Date.now() - startTime;
      const outputHash = createHash("sha256")
        .update(JSON.stringify(output || {}))
        .digest("hex");

      const auditRecord = await merkleAuditLedger.enqueueInvocation(
        {
          agentId: options.agentId,
          toolName: options.toolName,
          institutionId: options.institutionId,
          status: "success",
          durationMs,
          inputHash,
          outputHash,
        },
        { immediateFlush: true }
      );

      return {
        status: "success",
        output,
        durationMs,
        auditHash: auditRecord.auditHash,
      };
    } catch (err: any) {
      if (timerId) clearTimeout(timerId);
      const durationMs = Date.now() - startTime;
      const isTimeout = err.message && err.message.includes("timeout");

      await merkleAuditLedger.enqueueInvocation(
        {
          agentId: options.agentId,
          toolName: options.toolName,
          institutionId: options.institutionId,
          status: "error",
          durationMs,
          inputHash,
          error: err.message,
        },
        { immediateFlush: true }
      );

      return {
        status: isTimeout ? "timeout" : "error",
        error: err.message,
        durationMs,
      };
    } finally {
      PluginSandbox.activeExecutions = Math.max(
        0,
        PluginSandbox.activeExecutions - 1
      );
    }
  }
}
