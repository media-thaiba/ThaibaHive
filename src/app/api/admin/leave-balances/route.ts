import { NextResponse } from "next/server";
import { db } from "@/db";
import { leaveBalances, staff, leaveTypes } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, desc } from "drizzle-orm";

export const GET = requireAuth(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year") || String(new Date().getFullYear());

  const balances = await db
    .select({
      id: leaveBalances.id,
      staffId: leaveBalances.staffId,
      leaveTypeId: leaveBalances.leaveTypeId,
      totalDays: leaveBalances.totalDays,
      usedDays: leaveBalances.usedDays,
      year: leaveBalances.year,
      staffName: staff.firstName,
      staffLastName: staff.lastName,
      employeeId: staff.employeeId,
      leaveTypeName: leaveTypes.name,
      leaveTypeCode: leaveTypes.code,
    })
    .from(leaveBalances)
    .leftJoin(staff, eq(leaveBalances.staffId, staff.id))
    .leftJoin(leaveTypes, eq(leaveBalances.leaveTypeId, leaveTypes.id))
    .where(eq(leaveBalances.year, parseInt(year)))
    .orderBy(desc(leaveBalances.year))
    .all();

  return NextResponse.json({ balances });
}, "leave:manage");

export const POST = requireAuth(async (request: Request) => {
  const body = await request.json();
  const { staffId, leaveTypeId, year, totalDays } = body;

  if (!staffId || !leaveTypeId || !year || totalDays === undefined) {
    return NextResponse.json(
      { error: "staffId, leaveTypeId, year, and totalDays are required" },
      { status: 400 }
    );
  }

  const balance = await db
    .insert(leaveBalances)
    .values({
      id: crypto.randomUUID(),
      staffId,
      leaveTypeId,
      year,
      totalDays,
      usedDays: 0,
    })
    .returning()
    .get();

  return NextResponse.json({ balance }, { status: 201 });
}, "leave:manage");
