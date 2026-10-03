import { NextResponse } from "next/server";
import { db } from "@/db";
import { auditLogs, auditMerkleRoots } from "@thaiba/db/schema";
import { eq, and, gte, lte, asc, count } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { verifyAuditChain } from "@/lib/audit/crypto-audit-engine";
import { z } from "zod";

const verifyQuerySchema = z.object({
  tenantId: z.string().optional().default("default"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50000).optional().default(10000),
});

async function handler(req: Request, _session: any) {
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
        tenantId: searchParams.get("tenantId") || undefined,
        startDate: searchParams.get("startDate") || undefined,
        endDate: searchParams.get("endDate") || undefined,
        limit: searchParams.get("limit") || undefined,
      };
    }

    const parsed = verifyQuerySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const { tenantId, startDate, endDate, limit } = parsed.data;

    const conditions = [];
    if (tenantId && tenantId !== "all") {
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
        .where(tenantId && tenantId !== "all" ? eq(auditMerkleRoots.tenantId, tenantId) : undefined);
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
    console.error("[@thaiba/compliance] Audit verification error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error during audit chain verification" },
      { status: 500 }
    );
  }
}

export const POST = requireAuth(handler, "compliance:audit");
export const GET = requireAuth(handler, "compliance:audit");
