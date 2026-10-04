import { NextResponse } from "next/server";
import { db } from "@/db";
import { auditLogs, auditMerkleRoots } from "@thaiba/db/schema";
import { eq, and, gte, lte, asc, count } from "drizzle-orm";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { verifyAuditChain } from "@/lib/audit/crypto-audit-engine";
import type { SessionPayload } from "@thaiba/auth";
import crypto from "crypto";
import { z } from "zod";

const verifyQuerySchema = z.object({
  tenantId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50000).optional().default(10000),
});

async function handler(req: Request, session: SessionPayload) {
  try {
    let body = {};
    if (req.method === "POST") {
      try {
        body = await req.json();
      } catch {
        body = {};
      }
    } else {
      const { searchParams } = new URL(req.url);
      body = {
        tenantId: searchParams.get("tenantId") || searchParams.get("institutionId") || undefined,
        startDate: searchParams.get("startDate") || undefined,
        endDate: searchParams.get("endDate") || undefined,
        limit: searchParams.get("limit") || undefined,
      };
    }

    const parsed = verifyQuerySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const rawInst = parsed.data.tenantId && parsed.data.tenantId !== "default" && parsed.data.tenantId !== "all" ? parsed.data.tenantId : undefined;
    const resolved = await resolveRequestInstitution(session, rawInst);
    const tenantId = resolved === "global" ? undefined : resolved;
    const { startDate, endDate, limit } = parsed.data;

    const conditions = [];
    if (tenantId) {
      conditions.push(eq(auditLogs.tenantId, tenantId));
    }
    if (startDate) {
      conditions.push(gte(auditLogs.timestamp, startDate));
    }
    if (endDate) {
      conditions.push(lte(auditLogs.timestamp, endDate));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const entries = await db
      .select()
      .from(auditLogs)
      .where(whereClause)
      .orderBy(asc(auditLogs.timestamp), asc(auditLogs.createdAt))
      .limit(limit);

    const verificationResult = verifyAuditChain(entries as any);

    // Count associated Merkle roots
    let rootCount = 0;
    try {
      const rootRes = await db
        .select({ count: count() })
        .from(auditMerkleRoots)
        .where(tenantId ? eq(auditMerkleRoots.tenantId, tenantId) : undefined);
      rootCount = rootRes[0]?.count ?? 0;
    } catch {
      rootCount = 0;
    }

    return NextResponse.json({
      ...verificationResult,
      merkleRootsVerified: rootCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    if (error?.name === "TenantMismatchError") throw error;
    const requestId = crypto.randomUUID();
    console.error(`[@thaiba/compliance][requestId:${requestId}] Audit verification error:`, error);
    return NextResponse.json(
      { error: "Internal server error during audit chain verification", requestId },
      { status: 500 }
    );
  }
}

export const POST = requireAuth(handler, "compliance:audit");
export const GET = requireAuth(handler, "compliance:audit");
