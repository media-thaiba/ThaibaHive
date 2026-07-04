import { NextResponse } from "next/server";
import { db } from "@/db";
import { shifts } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
export const GET = requireAuth(async () => {
  const all = await db.select().from(shifts).orderBy(shifts.name).all();
  return NextResponse.json({ shifts: all });
}, "attendance:manage");

export const POST = requireAuth(async (request: Request) => {
  const body = await request.json();
  const { name, startTime, endTime, gracePeriodMinutes, departmentId } = body;

  if (!name || !startTime || !endTime) {
    return NextResponse.json({ error: "Name, start time, and end time required" }, { status: 400 });
  }

  const shift = await db
    .insert(shifts)
    .values({
      id: crypto.randomUUID(),
      name,
      startTime,
      endTime,
      gracePeriodMinutes: gracePeriodMinutes ?? 15,
      departmentId: departmentId || null,
      applicableToAll: !departmentId,
    })
    .returning()
    .get();

  return NextResponse.json({ shift }, { status: 201 });
}, "attendance:manage");
