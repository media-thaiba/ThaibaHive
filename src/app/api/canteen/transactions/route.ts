import { NextResponse } from "next/server";
import { db } from "@/db";
import { canteenTransactions } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, desc } from "drizzle-orm";

export const GET = requireAuth(async (request: Request, session) => {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId") || session.staffId;

  const transactions = await db
    .select()
    .from(canteenTransactions)
    .where(eq(canteenTransactions.userId, userId))
    .orderBy(desc(canteenTransactions.createdAt))
    .all();

  return NextResponse.json({ transactions });
}, "canteen:read");
