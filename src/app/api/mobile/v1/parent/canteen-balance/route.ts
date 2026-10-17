import { NextResponse } from "next/server";
import { db } from "@/db";
import { canteenMealPasses, canteenTransactions } from "@/db/schema";
import { requireAuth, resolveScopedInstitutions } from "@/lib/api/auth-guard";
import { and, eq, inArray, desc } from "drizzle-orm";

function isManagerRole(role: string): boolean {
  return role === "admin" || role === "super_admin" || role === "principal";
}

export const GET = requireAuth(async (request: Request, session) => {
  const url = new URL(request.url);
  const requestedStudentId = url.searchParams.get("studentId");

  if (requestedStudentId && requestedStudentId !== session.staffId && !isManagerRole(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const studentId = requestedStudentId && isManagerRole(session.role) ? requestedStudentId : session.staffId;
  const allowedInstitutions = await resolveScopedInstitutions(session);

  const conditions = [eq(canteenMealPasses.userId, studentId)];
  if (!allowedInstitutions.includes("global")) {
    conditions.push(inArray(canteenMealPasses.institutionId, allowedInstitutions));
  }

  const pass = await db
    .select()
    .from(canteenMealPasses)
    .where(and(...conditions))
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

export const POST = requireAuth(async (request: Request, session) => {
  const body = await request.json();
  const { studentId, dietaryFlags } = body;

  if (!studentId || !dietaryFlags) {
    return NextResponse.json({ error: "Missing required dietary parameters" }, { status: 400 });
  }

  if (studentId !== session.staffId && !isManagerRole(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    success: true,
    studentId,
    dietaryFlags,
    updatedAt: new Date().toISOString(),
  });
}, "canteen:manage");
