import { NextResponse } from "next/server";
import { db } from "@/db";
import { canteenTransactions } from "@/db/schema";
import { requireAuth, resolveScopedInstitutions } from "@/lib/api/auth-guard";
import { and, eq, inArray, desc } from "drizzle-orm";

export const GET = requireAuth(async (request: Request, session) => {
  const url = new URL(request.url);
  const requestedUserId = url.searchParams.get("userId");
  const isManager =
    session.role === "admin" || session.role === "super_admin" || session.role === "principal";

  if (requestedUserId && requestedUserId !== session.staffId && !isManager) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = requestedUserId && isManager ? requestedUserId : session.staffId;
  const allowedInstitutions = await resolveScopedInstitutions(session);

  const conditions = [eq(canteenTransactions.userId, userId)];
  if (!allowedInstitutions.includes("global")) {
    conditions.push(inArray(canteenTransactions.institutionId, allowedInstitutions));
  }

  const transactions = await db
    .select()
    .from(canteenTransactions)
    .where(and(...conditions))
    .orderBy(desc(canteenTransactions.createdAt))
    .all();

  return NextResponse.json({ transactions });
}, "canteen:read");
