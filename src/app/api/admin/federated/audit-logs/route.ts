import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { FederatedAuditAggregator, AuditSeverity } from "@/lib/federated/federated-audit-aggregator";

const defaultAuditAggregator = new FederatedAuditAggregator();

export const GET = requireAuth(async (request: Request) => {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId") || undefined;
    const severity = (searchParams.get("severity") as AuditSeverity) || undefined;
    const anonymizedOnly = searchParams.get("anonymized") === "true";

    const logs = defaultAuditAggregator.queryAuditLogs({
      tenantId,
      severity,
      anonymizedOnly,
    });

    const report = defaultAuditAggregator.aggregateComplianceReport(tenantId ? [tenantId] : undefined);

    return NextResponse.json({ logs, report }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to query audit logs" },
      { status: 500 }
    );
  }
}, "federated:audit");

export const POST = requireAuth(async (request: Request) => {
  let body: any = {};
  try {
    body = await request.json();
  } catch {
    try {
      const text = await request.text();
      if (text) body = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }
  }

  const { action, actorId, severity = "INFO", details = {}, institutionId, anonymize = false } = body;

  if (!action || !actorId) {
    return NextResponse.json({ error: "action and actorId are required" }, { status: 400 });
  }

  try {
    const log = defaultAuditAggregator.recordAuditLog(
      "tenant-main",
      action,
      actorId,
      severity,
      details,
      institutionId,
      anonymize
    );
    return NextResponse.json({ message: "Audit log recorded", log }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to record audit log" },
      { status: 500 }
    );
  }
}, "federated:audit");
