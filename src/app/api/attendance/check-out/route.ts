import { NextResponse } from "next/server";
import { db } from "@/db";
import { attendanceLogs } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { resolveShift } from "@/lib/attendance/shifts";
import { eq, and } from "drizzle-orm";

export const POST = requireAuth(async (_request, session) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const now = new Date();

    const log = await db
      .select()
      .from(attendanceLogs)
      .where(
        and(
          eq(attendanceLogs.staffId, session.staffId),
          eq(attendanceLogs.date, today)
        )
      )
      .get();

    if (!log) {
      return NextResponse.json(
        { error: "No check-in found for today." },
        { status: 400 }
      );
    }

    if (log.checkOut) {
      return NextResponse.json(
        { error: "Already checked out today." },
        { status: 409 }
      );
    }

    const checkIn = new Date(log.checkIn!);
    const workedMinutes = Math.round((now.getTime() - checkIn.getTime()) / 60000);

    // ─── Resolve Shift & Calculate Early Exit minutes ───
    const shift = await resolveShift(session.staffId, today);
    const [endH, endM] = shift.endTime.split(":").map(Number);
    const shiftEnd = new Date(now);
    shiftEnd.setHours(endH, endM, 0, 0);

    let earlyExitMinutes = 0;
    if (now.getTime() < shiftEnd.getTime()) {
      earlyExitMinutes = Math.floor((shiftEnd.getTime() - now.getTime()) / 60000);
    }

    const updated = await db
      .update(attendanceLogs)
      .set({
        checkOut: now.toISOString(),
        workedMinutes,
        earlyExitMinutes,
      })
      .where(eq(attendanceLogs.id, log.id))
      .returning()
      .get();

    return NextResponse.json({ log: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});