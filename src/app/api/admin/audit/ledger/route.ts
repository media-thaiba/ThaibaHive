import { NextResponse } from "next/server";
import { db } from "@/db";
import { auditLogs } from "@thaiba/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { resolveScopedInstitutionId, TenantMismatchError } from "@thaiba/auth";
import { eq, and, gte, lte, asc } from "drizzle-orm";

export const GET = requireAuth(async (request: Request, session) => {
  const url = new URL(request.url);
  const requestedTenantId = url.searchParams.get("tenantId");

  let targetTenantId: string;
  try {
    targetTenantId = await resolveScopedInstitutionId(requestedTenantId, session, { allowGlobal: true });
  } catch (err: any) {
    if (err instanceof TenantMismatchError || err.name === "TenantMismatchError") {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Unauthorized tenant scope" }, { status: 403 });
  }

  const fromSeqParam = url.searchParams.get("fromSeq");
  const toSeqParam = url.searchParams.get("toSeq");
  const actionParam = url.searchParams.get("action");
  const limitParam = url.searchParams.get("limit");

  const limit = Math.min(Math.max(Number(limitParam) || 50, 1), 200);

  const conditions = [eq(auditLogs.tenantId, targetTenantId)];

  if (fromSeqParam) {
    const fromSeq = Number(fromSeqParam);
    if (!isNaN(fromSeq)) {
      conditions.push(gte(auditLogs.sequenceNumber, fromSeq));
    }
  }

  if (toSeqParam) {
    const toSeq = Number(toSeqParam);
    if (!isNaN(toSeq)) {
      conditions.push(lte(auditLogs.sequenceNumber, toSeq));
    }
  }

  if (actionParam) {
    conditions.push(eq(auditLogs.action, actionParam));
  }

  const query = db
    .select()
    .from(auditLogs)
    .where(and(...conditions))
    .orderBy(asc(auditLogs.sequenceNumber))
    .limit(limit);

  const entries = await (query.all ? query.all() : query);

  return NextResponse.json({
    tenantId: targetTenantId,
    count: entries.length,
    entries,
  });
}, "system:audit:read");
