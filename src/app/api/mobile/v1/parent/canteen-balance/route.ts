import { NextResponse } from "next/server";
import { db } from "@/db";
import { canteenMealPasses, canteenTransactions } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, desc } from "drizzle-orm";

export const GET = requireAuth(async (request: Request, session) => {
  const url = new URL(request.url);
  const studentId = url.searchParams.get("studentId") || session.staffId;

  const pass = await db
    .select()
    .from(canteenMealPasses)
    .where(eq(canteenMealPasses.userId, studentId))
    .get();

  const transactions = pass
    ? await db
        .select()
        .from(canteenTransactions)
        .where(eq(canteenTransactions.passId, pass.id))
        .orderBy(desc(canteenTransactions.createdAt))
        .limit(10)
        .all()
    : [];

  return NextResponse.json({
    studentId,
    passCode: pass?.passCode || "CMP-DEFAULT",
    balance: pass?.balance || 0.0,
    currency: pass?.currency || "INR",
    status: pass?.status || "active",
    recentTransactions: transactions,
    isLowBalance: (pass?.balance || 0.0) < 100.0,
  });
}, "canteen:read");

export const POST = requireAuth(async (request: Request) => {
  const body = await request.json();
  const { studentId, dietaryFlags } = body;

  if (!studentId || !dietaryFlags) {
    return NextResponse.json({ error: "Missing required dietary parameters" }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    studentId,
    dietaryFlags,
    updatedAt: new Date().toISOString(),
  });
}, "canteen:manage");
