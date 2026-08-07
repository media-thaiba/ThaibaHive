import { NextResponse } from "next/server";
import { db } from "@/db";
import { preferenceAuditLog } from "@thaiba/db/schema";
import { eq, and, sql, desc, asc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { z } from "zod";

const querySchema = z.object({
  userId: z.string().optional(),
  preferenceKey: z.string().optional(),
  institutionId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["timestamp", "userId", "preferenceKey"]).default("timestamp"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

async function handler(req: Request, session: any) {
  if (session.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const params = {
      userId: searchParams.get("userId") || undefined,
      preferenceKey: searchParams.get("preferenceKey") || undefined,
      institutionId: searchParams.get("institutionId") || undefined,
      page: searchParams.get("page") ? Number(searchParams.get("page")) : undefined,
      limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined,
      sortBy: searchParams.get("sortBy") || undefined,
      sortOrder: searchParams.get("sortOrder") || undefined,
    };

    const parsed = querySchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const { userId, preferenceKey, institutionId, page, limit, sortBy, sortOrder } = parsed.data;

    const conditions = [];
    if (userId) conditions.push(eq(preferenceAuditLog.userId, userId));
    if (preferenceKey) conditions.push(eq(preferenceAuditLog.preferenceKey, preferenceKey));
    if (institutionId) conditions.push(eq(preferenceAuditLog.institutionId, institutionId));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Count total records matching filter
    const totalCountResult = await db
      .select({ count: sql<number>`count(${preferenceAuditLog.id})` })
      .from(preferenceAuditLog)
      .where(whereClause)
      .get();
    const total = totalCountResult?.count ?? 0;

    // Sort order
    const orderColumn = preferenceAuditLog[sortBy];
    const sortExpression = sortOrder === "asc" ? asc(orderColumn) : desc(orderColumn);

    const logs = await db
      .select()
      .from(preferenceAuditLog)
      .where(whereClause)
      .orderBy(sortExpression)
      .limit(limit)
      .offset((page - 1) * limit)
      .all();

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("[Audit Logs API] Failed to fetch preference audit logs:", err);
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
  }
}

export const GET = requireAuth(handler, "admin:audit");
