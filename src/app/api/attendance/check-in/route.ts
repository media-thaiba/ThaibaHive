import { NextResponse } from "next/server";
import { db } from "@/db";
import { attendanceLogs, attendanceLocations } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { checkInSchema } from "@/lib/validation/schemas";
import {
  validateNfcCheckIn,
  validateQrCheckIn,
  AttendanceValidationError,
} from "@/lib/attendance/validation";
import { resolveShift } from "@/lib/attendance/shifts";
import { calculateLateMinutes } from "@/lib/attendance/calculations";
import { localDateISO } from "@/lib/attendance/local-date";
import { isPresenceTrackingEnabled } from "@/lib/features";
import { isUniqueConstraintViolation } from "@/lib/api/sqlite-errors";
import { eq, and } from "drizzle-orm";

/** Accidental double-tap window: a re-punch within this window returns the
 * active check-in idempotently (200 + duplicate flag) instead of a 400 toast. */
const CHECK_IN_DEBOUNCE_MS = 60_000;

export const POST = requireAuth(async (request, session) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const result = checkInSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message ?? "Invalid payload parameters.", details: result.error.format() },
        { status: 400 }
      );
    }

    const {
      method,
      latitude,
      longitude,
      accuracy,
      wifiSsid,
      nfcTagId,
      qrCode,
      nfcNonce,
      tapAt,
    } = result.data;
    const today = localDateISO();
    const now = new Date();

    // ─── Perform check-in validation ───
    let locationId: string | null = null;
    let matchedLocation: typeof attendanceLocations.$inferSelect | undefined;
    if (method === "nfc") {
      if (!nfcTagId) {
        return NextResponse.json(
          { error: "NFC tag ID is required for NFC check-in." },
          { status: 400 }
        );
      }
      const requireAntiReplay = isPresenceTrackingEnabled(
        session.institutionId && session.institutionId !== "global"
          ? session.institutionId
          : undefined
      );
      await validateNfcCheckIn(
        session.staffId,
        nfcTagId,
        latitude ?? undefined,
        longitude ?? undefined,
        accuracy ?? undefined,
        wifiSsid || undefined,
        { nonce: nfcNonce, tapAt, requireAntiReplay }
      );
      // Look up location by NFC tag to get geofence info
      const location = await db
        .select()
        .from(attendanceLocations)
        .where(and(
          eq(attendanceLocations.nfcTagId, nfcTagId),
          eq(attendanceLocations.isActive, true)
        ))
        .get();
      if (location) {
        locationId = location.id;
        matchedLocation = location;
      }
    } else if (method === "qr") {
      if (!qrCode) {
        return NextResponse.json(
          { error: "QR code is required for QR check-in." },
          { status: 400 }
        );
      }
      await validateQrCheckIn(qrCode, latitude ?? undefined, longitude ?? undefined, accuracy ?? undefined, wifiSsid || undefined);
      // Extract location ID from QR code payload
      try {
        const jsonStr = Buffer.from(qrCode, "base64url").toString("utf-8");
        const payload = JSON.parse(jsonStr);
        locationId = payload.locationId;
      } catch {
        // Ignore parsing errors - location lookup will fail gracefully
      }
      if (locationId) {
        matchedLocation = await db
          .select()
          .from(attendanceLocations)
          .where(eq(attendanceLocations.id, locationId))
          .get();
      }
    }

    // ─── Check duplicate check-in (debounced & idempotent) ───
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
      const withinDebounce =
        !existingLog.checkOut &&
        existingLog.checkIn !== null &&
        now.getTime() - new Date(existingLog.checkIn).getTime() <=
          CHECK_IN_DEBOUNCE_MS;

      if (withinDebounce) {
        // Accidental rapid double-tap: return the active check-in record
        // idempotently so the client shows a success state, not an error.
        return NextResponse.json(
          { log: existingLog, duplicate: true },
          { status: 200 }
        );
      }
      return NextResponse.json(
        { error: "Already checked in today." },
        { status: 400 }
      );
    }

    // ─── Resolve Shift & Calculate Late status ───
    const shift = await resolveShift(session.staffId, today);
    const { lateMinutes, status } = calculateLateMinutes(now, shift.startTime, shift.gracePeriodMinutes);

    const resolvedInstitutionId =
      matchedLocation?.institutionId ??
      (session.institutionId && session.institutionId !== "global"
        ? session.institutionId
        : null);

    const logId = crypto.randomUUID();
    let newLog;
    try {
      newLog = await db
        .insert(attendanceLogs)
        .values({
          id: logId,
          staffId: session.staffId,
          institutionId: resolvedInstitutionId,
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
    } catch (error: unknown) {
      if (isUniqueConstraintViolation(error, "attendance_logs")) {
        // Concurrent double-tap raced past the pre-check; the unique
        // (staff_id, date) index rejected the second insert. Apply the same
        // debounce rule against the now-persisted row.
        const raced = await db
          .select()
          .from(attendanceLogs)
          .where(
            and(
              eq(attendanceLogs.staffId, session.staffId),
              eq(attendanceLogs.date, today)
            )
          )
          .get();
        if (
          raced &&
          !raced.checkOut &&
          raced.checkIn !== null &&
          now.getTime() - new Date(raced.checkIn).getTime() <=
            CHECK_IN_DEBOUNCE_MS
        ) {
          return NextResponse.json(
            { log: raced, duplicate: true },
            { status: 200 }
          );
        }
        return NextResponse.json(
          { error: "Already checked in today." },
          { status: 400 }
        );
      }
      throw error;
    }

    // ─── Fetch geofence config for the location ───
    let geofenceConfig = null;
    if (matchedLocation && matchedLocation.latitude && matchedLocation.longitude) {
      geofenceConfig = {
        latitude: matchedLocation.latitude,
        longitude: matchedLocation.longitude,
        radius: matchedLocation.radius || 150,
        locationName: matchedLocation.name,
      };
    }

    return NextResponse.json({ log: newLog, geofence: geofenceConfig }, { status: 201 });
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
}, "attendance:read");