import { NextResponse } from "next/server";
import { db } from "@/db";
import { complianceViolations } from "@thaiba/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { ViolationSeverity, ViolationStatus } from "@/lib/compliance/types";

async function getHandler(req: Request, session: any) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get("tenantId") || undefined;
    const severity = searchParams.get("severity") || undefined;
    const status = searchParams.get("status") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const conditions = [];
    if (tenantId && tenantId !== "all") {
      conditions.push(eq(complianceViolations.tenantId, tenantId));
    }
    if (severity) {
      conditions.push(eq(complianceViolations.severity, severity));
    }
    if (status) {
      conditions.push(eq(complianceViolations.status, status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const records = await db
      .select()
      .from(complianceViolations)
      .where(whereClause)
      .orderBy(desc(complianceViolations.createdAt))
      .limit(limit);

    return NextResponse.json({
      violations: records.map((r) => ({
        ...r,
        severity: r.severity as ViolationSeverity,
        status: r.status as ViolationStatus,
        details: r.details ? JSON.parse(r.details) : {},
      })),
      total: records.length,
    });
  } catch (error: any) {
    console.error("[@thaiba/compliance] Get violations error:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}

export const GET = requireAuth(getHandler, "compliance:read");
