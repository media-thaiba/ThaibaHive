import { NextResponse } from "next/server";
import { db } from "@/db";
import { auditLogs, auditMerkleRoots, userSessions } from "@thaiba/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { resolveScopedInstitutionId, TenantMismatchError } from "@thaiba/auth";
import { eq, and, sql, desc, count } from "drizzle-orm";

function isPostgresDialect(runner: any): boolean {
  if (!runner) return false;
  const dialectName = runner?.dialect?.constructor?.name?.toLowerCase() || "";
  const sessionName = runner?.session?.constructor?.name?.toLowerCase() || "";
  if (dialectName.includes("pg") || sessionName.includes("pg")) return true;
  if (runner?.session?.client?.execProtocol || runner?.session?.client?.waitReady !== undefined) return true;
  return false;
}

export async function checkDiagnosticsHealth(
  targetTenantId: string = "global",
  runner: any = db
) {
  const isPostgres = isPostgresDialect(runner);
  const _startTime = Date.now();

  // 1. Database Ping & Latency Probe
  let dbStatus = "connected";
  let latencyMs = 0;
  try {
    const pingStart = Date.now();
    if (typeof runner.execute === "function") {
      await runner.execute(sql`SELECT 1`);
    } else if (typeof runner.run === "function") {
      await runner.run(sql`SELECT 1`);
    }
    latencyMs = Date.now() - pingStart;
  } catch (_err) {
    dbStatus = "disconnected";
  }

  // 2. Trigger Introspection (Guardrail 2)
  let activeTriggers: string[] = [];
  try {
    if (isPostgres) {
      const res = await runner.execute(sql`
        SELECT tgname AS name FROM pg_trigger
        WHERE tgname IN ('trg_audit_logs_no_update', 'trg_audit_logs_no_delete')
      `);
      const rows = res?.rows || res || [];
      activeTriggers = rows.map((r: any) => r.name);
    } else {
      // SQLite / LibSQL
      let rows: any[] = [];
      if (typeof runner.all === "function") {
        rows = await runner.all(sql`
          SELECT name FROM sqlite_master
          WHERE type = 'trigger' AND name IN ('trg_audit_logs_no_update', 'trg_audit_logs_no_delete')
        `);
      } else if (typeof runner.execute === "function") {
        const res = await runner.execute(sql`
          SELECT name FROM sqlite_master
          WHERE type = 'trigger' AND name IN ('trg_audit_logs_no_update', 'trg_audit_logs_no_delete')
        `);
        rows = res?.rows || res || [];
      }
      activeTriggers = rows.map((r: any) => r.name);
    }
  } catch (_err) {
    // Triggers failed to inspect
  }

  const hasNoUpdate = activeTriggers.includes("trg_audit_logs_no_update");
  const hasNoDelete = activeTriggers.includes("trg_audit_logs_no_delete");
  const triggersActive = hasNoUpdate && hasNoDelete;
  const triggerStatus = triggersActive ? "active" : "degraded";

  // 3. Active Sessions Count
  let activeSessionCount = 0;
  try {
    const sessionQuery = runner
      .select({ count: count() })
      .from(userSessions)
      .where(eq(userSessions.status, "active"));
    const sessionRes = await (sessionQuery.all ? sessionQuery.all() : sessionQuery);
    if (sessionRes && sessionRes.length > 0) {
      activeSessionCount = Number(sessionRes[0].count) || 0;
    }
  } catch {
    // Session count optional fallback
  }

  // 4. Cryptographic Audit Ledger Head & Merkle Roots
  let latestSequenceNumber = 0;
  let latestHash = "0".repeat(64);
  let merkleRootsCount = 0;

  try {
    const auditConditions = targetTenantId !== "global"
      ? [eq(auditLogs.tenantId, targetTenantId)]
      : [];

    const headQuery = runner
      .select({
        sequenceNumber: auditLogs.sequenceNumber,
        currentHash: auditLogs.currentHash,
      })
      .from(auditLogs)
      .where(auditConditions.length > 0 ? and(...auditConditions) : undefined)
      .orderBy(desc(auditLogs.sequenceNumber))
      .limit(1);

    const headRows = await (headQuery.all ? headQuery.all() : headQuery);
    if (headRows && headRows.length > 0) {
      latestSequenceNumber = headRows[0].sequenceNumber;
      latestHash = headRows[0].currentHash;
    }

    const merkleConditions = targetTenantId !== "global"
      ? [eq(auditMerkleRoots.tenantId, targetTenantId)]
      : [];

    const merkleQuery = runner
      .select({ count: count() })
      .from(auditMerkleRoots)
      .where(merkleConditions.length > 0 ? and(...merkleConditions) : undefined);

    const merkleRes = await (merkleQuery.all ? merkleQuery.all() : merkleQuery);
    if (merkleRes && merkleRes.length > 0) {
      merkleRootsCount = Number(merkleRes[0].count) || 0;
    }
  } catch {
    // Audit metrics fallback
  }

  const isHealthy = dbStatus === "connected" && triggersActive;

  return {
    status: isHealthy ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    tenantId: targetTenantId,
    database: {
      status: dbStatus,
      dialect: isPostgres ? "postgres" : "sqlite",
      latencyMs,
    },
    immutabilityTriggers: {
      status: triggerStatus,
      triggers: activeTriggers,
      missing: [
        ...(!hasNoUpdate ? ["trg_audit_logs_no_update"] : []),
        ...(!hasNoDelete ? ["trg_audit_logs_no_delete"] : []),
      ],
    },
    sessions: {
      activeCount: activeSessionCount,
      status: "healthy",
    },
    auditLedger: {
      latestSequenceNumber,
      latestHash,
      merkleRootsCount,
    },
  };
}

export const GET = requireAuth(async (request: Request, session) => {
  const url = new URL(request.url);
  const requestedTenantId = url.searchParams.get("tenantId");

  // Tenant Scoping Guard (Guardrail 3)
  let targetTenantId: string;
  try {
    targetTenantId = await resolveScopedInstitutionId(requestedTenantId, session, { allowGlobal: true });
  } catch (_err) {
    if (_err instanceof TenantMismatchError || (_err instanceof Error && _err.name === "TenantMismatchError")) {
      return NextResponse.json({ error: _err.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Unauthorized tenant scope" }, { status: 403 });
  }

  const health = await checkDiagnosticsHealth(targetTenantId);

  const statusCode = health.status === "healthy" ? 200 : 503;
  return NextResponse.json(health, { status: statusCode });
}, "system:diagnostics:read");
