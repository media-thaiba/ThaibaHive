import { NextResponse } from "next/server";
import { db } from "@/db";
import { purchaseRequests } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { purchaseCreateSchema } from "@/lib/validation/schemas";
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
        return NextResponse.json({ purchases: [] });
      }
      conditions.push(inArray(purchaseRequests.requesterId, managedIds));
    }
  } else {
    conditions.push(eq(purchaseRequests.requesterId, session.staffId));
  }

  if (status) conditions.push(eq(purchaseRequests.status, status));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const purchases = await db
    .select()
    .from(purchaseRequests)
    .where(whereClause)
    .orderBy(desc(purchaseRequests.createdAt))
    .all();

  return NextResponse.json({ purchases });
}, "finance:create");

export const POST = requireAuth(async (request: Request, session) => {
  const body = await request.json();
  const parsed = purchaseCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { itemName, quantity, estimatedCost, justification } = parsed.data;

  const purchase = await db
    .insert(purchaseRequests)
    .values({
      id: crypto.randomUUID(),
      requesterId: session.staffId,
      itemName,
      quantity,
      estimatedCost,
      justification: justification || null,
      status: "pending_hod",
    })
    .returning()
    .get();

  return NextResponse.json({ purchase }, { status: 201 });
}, "finance:create");
