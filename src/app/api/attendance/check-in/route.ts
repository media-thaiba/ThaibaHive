import { NextResponse } from "next/server";
import { db } from "@/db";
import { attendanceLogs, staffShifts } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, and } from "drizzle-orm";

export const POST = requireAuth(async (request: Request, session) => {
  const body = await request.json();
  const today = new Date().toISOString().split("T")[0];
  const now = new Date().toISOString();

  const { nfcTagId, qrCode, method } = body;

  const existing = await db
    .select()
    .from(attendanceLogs)
    .where(and(eq(attendanceLogs.staffId, session.staffId), eq(attendanceLogs.date, today)))
    .get();

  if (existing) {
    return NextResponse.json({ error: "Already checked in today", log: existing }, { status: 409 });
  }

  let lateMinutes = 0;
  const activeShift = await db
    .select()
    .from(staffShifts)
    .where(and(eq(staffShifts.staffId, session.staffId)))
    .all();

  if (activeShift.length > 0) {
    const shiftStart = activeShift[0].effectiveFrom;
    if (shiftStart) {
      const shiftTime = new Date(`${today}T${shiftStart}`);
      const checkInTime = new Date(now);
      const diff = (checkInTime.getTime() - shiftTime.getTime()) / 60000;
      if (diff > 0) lateMinutes = Math.round(diff);
    }
  }

  const log = await db
    .insert(attendanceLogs)
    .values({
      id: crypto.randomUUID(),
      staffId: session.staffId,
      date: today,
      checkIn: now,
      method: method || "manual",
      nfcTagId,
      qrCode,
      status: lateMinutes > 15 ? "late" : "present",
      lateMinutes,
    })
    .returning()
    .get();

  return NextResponse.json({ log }, { status: 201 });
});
