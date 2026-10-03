import { NextResponse } from "next/server";
import { db } from "@/db";
import { complianceViolations } from "@thaiba/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { auditAnomalyDetector } from "@/lib/compliance/anomaly-detector";
import { complianceMetrics } from "@/lib/observability/compliance-metrics";
import { ViolationSeverity, TelemetrySummary } from "@/lib/compliance/types";

async function handler(req: Request, _session: any) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get("tenantId") || undefined;

    const violations = await db
      .select()
      .from(complianceViolations)
      .where(tenantId && tenantId !== "all" ? eq(complianceViolations.tenantId, tenantId) : undefined)
      .orderBy(desc(complianceViolations.createdAt))
      .limit(100);

    const openViolations = violations.filter((v) => v.status === "OPEN" || v.status === "ACKNOWLEDGED");

    const violationsBySeverity: Record<ViolationSeverity, number> = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0,
    };

    for (const v of openViolations) {
      const sev = v.severity as ViolationSeverity;
      if (violationsBySeverity[sev] !== undefined) {
        violationsBySeverity[sev]++;
      }
    }

    // Calculate score
    let score = 100;
    score -= violationsBySeverity.CRITICAL * 20;
    score -= violationsBySeverity.HIGH * 10;
    score -= violationsBySeverity.MEDIUM * 4;
    score -= violationsBySeverity.LOW * 1;
    score = Math.max(0, Math.min(100, score));

    complianceMetrics.setComplianceScore(score);

    const status = score >= 85 ? "HEALTHY" : score >= 60 ? "DEGRADED" : "CRITICAL";

    const summary: TelemetrySummary = {
      status,
      overallScore: score,
      activeViolationsCount: openViolations.length,
      violationsBySeverity,
      activeRulesCount: auditAnomalyDetector.getRules().length,
      lastEvaluatedAt: auditAnomalyDetector.getLastEvaluatedAt(),
      recentViolations: violations.slice(0, 10).map((v) => ({
        ...v,
        severity: v.severity as ViolationSeverity,
        status: v.status as any,
        details: v.details ? JSON.parse(v.details) : {},
      })),
    };

    return NextResponse.json(summary);
  } catch (error: any) {
    console.error("[@thaiba/compliance] Telemetry route error:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}

export const GET = requireAuth(handler, "compliance:read");
