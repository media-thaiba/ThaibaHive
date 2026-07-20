import { NextResponse } from "next/server";
import { db } from "@/db";
import { expenseClaims } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { expenseClaimCreateSchema } from "@/lib/validation/schemas";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { getManagedStaffIds } from "@/lib/auth/department-scope";
import { eq, desc, and, inArray } from "drizzle-orm";

export const GET = requireAuth(async (request: Request, session) => {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const viewAll = searchParams.get("viewAll");

  const conditions = [];

  if (viewAll === "true") {
    const managedIds = await getManagedStaffIds(session.staffId, session.role);
    if (managedIds !== null) {
      if (managedIds.length === 0) {
        return NextResponse.json({ claims: [] });
      }
      conditions.push(inArray(expenseClaims.staffId, managedIds));
    }
  } else {
    conditions.push(eq(expenseClaims.staffId, session.staffId));
  }

  if (status) conditions.push(eq(expenseClaims.status, status));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const claims = await db
    .select()
    .from(expenseClaims)
    .where(whereClause)
    .orderBy(desc(expenseClaims.createdAt))
    .all();

  return NextResponse.json({ claims });
}, "finance:create");

export const POST = requireAuth(async (request: Request, session) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const body = await request.json();
  const parsed = expenseClaimCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { amount, category, description, receiptUrl } = parsed.data;

  const claim = await db
    .insert(expenseClaims)
    .values({
      id: crypto.randomUUID(),
      staffId: session.staffId,
      amount,
      category,
      description,
      receiptUrl: receiptUrl || null,
      status: "pending",
    })
    .returning()
    .get();

  return NextResponse.json({ claim }, { status: 201 });
}, "finance:create");
