import { NextResponse } from "next/server";
import { db } from "@/db";
import { attendanceLogs } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { checkInSchema } from "@/lib/validation/schemas";
import {
  validateNfcCheckIn,
  validateQrCheckIn,
  AttendanceValidationError,
} from "@/lib/attendance/validation";
import { resolveShift } from "@/lib/attendance/shifts";
import { calculateLateMinutes } from "@/lib/attendance/calculations";
import { eq, and } from "drizzle-orm";

export const POST = requireAuth(async (request, session) => {
  try {
    const body = await request.json();
    const result = checkInSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid payload parameters.", details: result.error.format() },
        { status: 400 }
      );
    }

    const { method, latitude, longitude, nfcTagId, qrCode } = result.data;
    const today = new Date().toISOString().split("T")[0];
    const now = new Date();

    // ─── Perform check-in validation ───
    if (method === "nfc") {
      if (!nfcTagId) {
        return NextResponse.json(
          { error: "NFC tag ID is required for NFC check-in." },
          { status: 400 }
        );
      }
      await validateNfcCheckIn(session.staffId, nfcTagId, latitude, longitude);
    } else if (method === "qr") {
      if (!qrCode) {
        return NextResponse.json(
          { error: "QR code is required for QR check-in." },
          { status: 400 }
        );
      }
      await validateQrCheckIn(qrCode, latitude, longitude);
    }

    // ─── Check duplicate check-in ───
    const existingLog = await db
      .select()
      .from(attendanceLogs)
      .where(
        and(
          eq(attendanceLogs.staffId, session.staffId),
          eq(attendanceLogs.date, today)
        )
      )
      .get();

    if (existingLog) {
      return NextResponse.json(
        { error: "Already checked in today." },
        { status: 400 }
      );
    }

    // ─── Resolve Shift & Calculate Late status ───
    const shift = await resolveShift(session.staffId, today);
    const { lateMinutes, status } = calculateLateMinutes(now, shift.startTime, shift.gracePeriodMinutes);

    const logId = crypto.randomUUID();
    const newLog = await db
      .insert(attendanceLogs)
      .values({
        id: logId,
        staffId: session.staffId,
        date: today,
        checkIn: now.toISOString(),
        method,
        nfcTagId: nfcTagId || null,
        qrCode: qrCode || null,
        status,
        lateMinutes,
      })
      .returning()
      .get();

    return NextResponse.json({ log: newLog }, { status: 201 });
  } catch (error) {
    if (error instanceof AttendanceValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});