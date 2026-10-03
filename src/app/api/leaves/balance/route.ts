import { NextResponse } from "next/server";
import { db } from "@/db";
import { leaveBalances, leaveTypes } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, and } from "drizzle-orm";

export const GET = requireAuth(async (_request, session) => {
  const year = new Date().getFullYear();

  const balances = await db
    .select({
      id: leaveBalances.id,
      leaveTypeId: leaveBalances.leaveTypeId,
      totalDays: leaveBalances.totalDays,
      usedDays: leaveBalances.usedDays,
      leaveTypeName: leaveTypes.name,
      leaveTypeCode: leaveTypes.code,
    })
    .from(leaveBalances)
    .leftJoin(leaveTypes, eq(leaveBalances.leaveTypeId, leaveTypes.id))
    .where(and(eq(leaveBalances.staffId, session.staffId), eq(leaveBalances.year, year)))
    .all();

  return NextResponse.json({ balances });
}, "leaves:read");
