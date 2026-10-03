import { NextResponse } from "next/server";
import { db } from "@/db";
import { expenseClaims } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { expenseClaimCreateSchema, paginationSchema } from "@/lib/validation/schemas";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { getManagedStaffIds } from "@/lib/auth/department-scope";
import { eq, desc, and, inArray, sql } from "drizzle-orm";

export const GET = requireAuth(async (request: Request, session) => {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const viewAll = searchParams.get("viewAll");

  const pagination = paginationSchema.parse({
    page: searchParams.get("page"),
    limit: searchParams.get("limit"),
  });
  const { page, limit } = pagination;
  const offset = (page - 1) * limit;

  const conditions = [];

  if (viewAll === "true") {
    const managedIds = await getManagedStaffIds(session.staffId, session.role);
    if (managedIds !== null) {
      if (managedIds.length === 0) {
        return NextResponse.json({ claims: [], total: 0, page, limit });
      }
      conditions.push(inArray(expenseClaims.staffId, managedIds));
    }
  } else {
    conditions.push(eq(expenseClaims.staffId, session.staffId));
  }

  if (status) conditions.push(eq(expenseClaims.status, status));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(expenseClaims)
    .where(whereClause)
    .get();
  const total = countResult?.count ?? 0;

  const claims = await db
    .select()
    .from(expenseClaims)
    .where(whereClause)
    .orderBy(desc(expenseClaims.createdAt))
    .limit(limit)
    .offset(offset)
    .all();

  return NextResponse.json({ claims, total, page, limit });
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

  if (amount >= 1000 && (!receiptUrl || !receiptUrl.trim())) {
    return NextResponse.json(
      { error: "A receipt attachment is required for expense claims of ₹1,000 or more." },
      { status: 400 }
    );
  }

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
