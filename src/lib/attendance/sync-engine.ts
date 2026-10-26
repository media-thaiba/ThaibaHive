import { db, attendanceEvents, attendanceDays, punchAttempts, attendanceLogs, institutions } from "@/db";
import { eq, and, asc, sql } from "drizzle-orm";
import type {
  AttendanceEventSyncItem,
  AttendanceSyncBatchRequest,
  AttendanceSyncBatchResponse,
  AttendanceSyncItemResult,
  TimeTrustLevel,
} from "./types";

const MAX_BATCH_SIZE = 50;
const MAX_FUTURE_DRIFT_MS = 2 * 60 * 1000; // 2 minutes allowed future clock drift
const MAX_OFFLINE_AGE_MS = 36 * 60 * 60 * 1000; // 36 hours max offline age

/**
 * Haversine distance in meters between two lat/lng coordinates
 */
export function calculateHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Derives localDate (YYYY-MM-DD) in the institution's timezone (default Asia/Kolkata)
 */
export function deriveLocalDate(epochMs: number, timeZone: string = "Asia/Kolkata"): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(new Date(epochMs));
  } catch {
    return new Date(epochMs).toISOString().split("T")[0];
  }
}

/**
 * Formats epoch ms into 24-hour HH:MM:SS in the institution's timezone
 */
export function formatLocalTime(epochMs: number, timeZone: string = "Asia/Kolkata"): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    return formatter.format(new Date(epochMs));
  } catch {
    return new Date(epochMs).toTimeString().split(" ")[0];
  }
}

/**
 * Atomic projection rebuilder: rebuilds attendance_days from immutable attendance_events
 */
export async function rebuildAttendanceDayProjection(
  staffId: string,
  localDate: string,
  institutionId?: string | null,
  timeZone: string = "Asia/Kolkata"
): Promise<void> {
  // Query all immutable events for this staff and date
  const events = await db
    .select()
    .from(attendanceEvents)
    .where(
      and(
        eq(attendanceEvents.staffId, staffId),
        eq(attendanceEvents.localDate, localDate)
      )
    )
    .orderBy(asc(attendanceEvents.effectiveAt));

  if (events.length === 0) return;

  const inEvents = events.filter((e) => e.kind === "in");
  const outEvents = events.filter((e) => e.kind === "out");

  const firstIn = inEvents.length > 0 ? inEvents[0].effectiveAt : null;
  const lastOut = outEvents.length > 0 ? outEvents[outEvents.length - 1].effectiveAt : null;

  const firstInTime = firstIn ? formatLocalTime(firstIn, timeZone) : null;
  const lastOutTime = lastOut ? formatLocalTime(lastOut, timeZone) : null;

  let totalMinutes = 0;
  if (firstIn && lastOut && lastOut >= firstIn) {
    totalMinutes = Math.round((lastOut - firstIn) / 60000);
  }

  // Detect review anomalies
  let needsReview = false;
  const reviewReasons: string[] = [];

  if (lastOut && !firstIn) {
    needsReview = true;
    reviewReasons.push("orphan_out: check-out recorded without check-in");
  }
  if (firstIn && lastOut && lastOut < firstIn) {
    needsReview = true;
    reviewReasons.push("invalid_sequence: lastOut is earlier than firstIn");
  }

  // Check event flags
  for (const ev of events) {
    if (ev.flags && (ev.flags.includes("mock_location") || ev.flags.includes("clock_skew") || ev.flags.includes("geofence_violation"))) {
      needsReview = true;
      if (!reviewReasons.includes(ev.flags)) reviewReasons.push(ev.flags);
    }
  }

  // Determine attendance status
  let status = "present";
  if (!firstIn && lastOut) {
    status = "half_day";
  } else if (firstIn && totalMinutes > 0 && totalMinutes < 240) {
    status = "half_day";
  }

  const nowEpoch = Date.now();
  const dayId = `attday_${staffId}_${localDate}`;

  // Upsert attendance_days projection
  const existingDay = await db
    .select()
    .from(attendanceDays)
    .where(
      and(
        eq(attendanceDays.staffId, staffId),
        eq(attendanceDays.localDate, localDate)
      )
    )
    .limit(1);

  if (existingDay.length > 0) {
    await db
      .update(attendanceDays)
      .set({
        firstIn,
        lastOut,
        firstInTime,
        lastOutTime,
        totalMinutes,
        status,
        needsReview,
        reviewReason: reviewReasons.length > 0 ? reviewReasons.join("; ") : null,
        rebuiltAt: nowEpoch,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(attendanceDays.id, existingDay[0].id));
  } else {
    try {
      await db.insert(attendanceDays).values({
        id: dayId,
        staffId,
        institutionId: institutionId || null,
        localDate,
        firstIn,
        lastOut,
        firstInTime,
        lastOutTime,
        totalMinutes,
        status,
        needsReview,
        reviewReason: reviewReasons.length > 0 ? reviewReasons.join("; ") : null,
        isPilot: true,
        rebuiltAt: nowEpoch,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      const errMsg = `${err?.message || ""} ${err?.cause?.message || ""} ${err?.code || ""}`;
      if (errMsg.includes("UNIQUE") || errMsg.includes("23505") || errMsg.includes("unique") || errMsg.includes("SQLITE_CONSTRAINT")) {
        await db
          .update(attendanceDays)
          .set({
            firstIn,
            lastOut,
            firstInTime,
            lastOutTime,
            totalMinutes,
            status,
            needsReview,
            reviewReason: reviewReasons.length > 0 ? reviewReasons.join("; ") : null,
            rebuiltAt: nowEpoch,
            updatedAt: new Date().toISOString(),
          })
          .where(
            and(
              eq(attendanceDays.staffId, staffId),
              eq(attendanceDays.localDate, localDate)
            )
          );
      } else {
        throw err;
      }
    }
  }

  // Backward-compatibility mirror into existing attendance_logs table
  const existingAtt = await db
    .select()
    .from(attendanceLogs)
    .where(
      and(
        eq(attendanceLogs.staffId, staffId),
        eq(attendanceLogs.date, localDate)
      )
    )
    .limit(1);

  if (existingAtt.length > 0) {
    await db
      .update(attendanceLogs)
      .set({
        checkIn: firstInTime || existingAtt[0].checkIn,
        checkOut: lastOutTime || existingAtt[0].checkOut,
        status,
        workedMinutes: totalMinutes,
        presenceStatus: needsReview ? "flagged" : "verified",
      })
      .where(eq(attendanceLogs.id, existingAtt[0].id));
  } else {
    try {
      await db.insert(attendanceLogs).values({
        id: `att_${staffId}_${localDate}`,
        staffId,
        institutionId: institutionId || null,
        date: localDate,
        checkIn: firstInTime,
        checkOut: lastOutTime,
        status,
        workedMinutes: totalMinutes,
        method: events[0]?.method || "geofence",
        source: "mobile_pilot",
        presenceStatus: needsReview ? "flagged" : "verified",
        createdAt: new Date().toISOString(),
      });
    } catch (err: any) {
      const errMsg = `${err?.message || ""} ${err?.cause?.message || ""} ${err?.code || ""}`;
      if (errMsg.includes("UNIQUE") || errMsg.includes("23505") || errMsg.includes("unique") || errMsg.includes("SQLITE_CONSTRAINT")) {
        await db
          .update(attendanceLogs)
          .set({
            checkIn: firstInTime,
            checkOut: lastOutTime,
            status,
            workedMinutes: totalMinutes,
            presenceStatus: needsReview ? "flagged" : "verified",
          })
          .where(
            and(
              eq(attendanceLogs.staffId, staffId),
              eq(attendanceLogs.date, localDate)
            )
          );
      } else {
        throw err;
      }
    }
  }
}

/**
 * Process a batch of attendance sync events
 */
export async function processAttendanceSyncBatch(
  staffId: string,
  sessionInstitutionId: string | null,
  batch: AttendanceSyncBatchRequest,
  auditContext: {
    requestId: string;
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<AttendanceSyncBatchResponse> {
  const results: AttendanceSyncItemResult[] = [];
  const events = batch.events || [];
  const processedAt = Date.now();

  if (events.length > MAX_BATCH_SIZE) {
    return {
      results: [
        {
          clientEventId: "batch_overflow",
          status: "rejected",
          reason: `Batch size exceeds limit of ${MAX_BATCH_SIZE} items`,
        },
      ],
      processedAt,
    };
  }

  const touchedDates = new Set<string>();

  for (const item of events) {
    const { clientEventId, kind, method } = item;

    // Validate mandatory item fields
    if (!clientEventId || typeof clientEventId !== "string" || clientEventId.trim().length === 0) {
      results.push({
        clientEventId: clientEventId || "unknown",
        status: "rejected",
        reason: "Missing or invalid clientEventId",
      });
      continue;
    }

    if (kind !== "in" && kind !== "out") {
      results.push({
        clientEventId,
        status: "rejected",
        reason: "Invalid event kind: must be 'in' or 'out'",
      });
      continue;
    }

    // Check idempotency (duplicate clientEventId for this staff)
    const existing = await db
      .select()
      .from(attendanceEvents)
      .where(
        and(
          eq(attendanceEvents.staffId, staffId),
          eq(attendanceEvents.clientEventId, clientEventId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      results.push({
        clientEventId,
        status: "duplicate",
        effectiveAt: existing[0].effectiveAt,
        timeTrust: existing[0].timeTrust as TimeTrustLevel,
      });
      continue;
    }

    // Calculate effectiveAt & timeTrust
    const now = Date.now();
    let effectiveAt = now;
    let timeTrust: TimeTrustLevel = "server";
    const flags: string[] = [];

    if (item.deviceClaimedAt && typeof item.deviceClaimedAt === "number") {
      const offset = typeof item.clockOffsetMs === "number" ? item.clockOffsetMs : 0;
      effectiveAt = item.deviceClaimedAt - offset;

      // Plausibility checks
      if (effectiveAt > now + MAX_FUTURE_DRIFT_MS) {
        flags.push("clock_skew_future");
        effectiveAt = now;
        timeTrust = "device_claimed";
      } else if (now - effectiveAt > MAX_OFFLINE_AGE_MS) {
        flags.push("stale_offline_event");
        timeTrust = "device_claimed";
      } else {
        timeTrust = "anchored";
      }
    }

    // Geolocation & mock checks
    if (item.isMocked) {
      flags.push("mock_location");
    }

    if (item.accuracyM && item.accuracyM > 100) {
      flags.push("poor_accuracy");
    }

    const localDate = deriveLocalDate(effectiveAt);
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Insert immutable event (race-safe against concurrent syncs)
    try {
      await db.insert(attendanceEvents).values({
        id: eventId,
        staffId,
        institutionId: sessionInstitutionId || null,
        clientEventId,
        kind,
        method: method || "geofence",
        effectiveAt,
        timeTrust,
        deviceClaimedAt: item.deviceClaimedAt || null,
        receivedAt: now,
        localDate,
        latitude: item.latitude || null,
        longitude: item.longitude || null,
        accuracyM: item.accuracyM || null,
        isMocked: Boolean(item.isMocked),
        geofenceId: item.geofenceId || null,
        deviceId: item.deviceId || null,
        appVersion: item.appVersion || null,
        flags: flags.length > 0 ? flags.join(", ") : null,
        isPilot: true,
        createdAt: new Date().toISOString(),
      });
    } catch (err: any) {
      const errMsg = `${err?.message || ""} ${err?.cause?.message || ""} ${err?.code || ""}`;
      if (errMsg.includes("UNIQUE") || errMsg.includes("23505") || errMsg.includes("unique") || errMsg.includes("SQLITE_CONSTRAINT")) {
        results.push({
          clientEventId,
          status: "duplicate",
          effectiveAt,
          timeTrust,
        });
        continue;
      }
      throw err;
    }

    // Record audit attempt
    await db.insert(punchAttempts).values({
      id: `pa_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      staffId,
      requestId: auditContext.requestId,
      ipAddress: auditContext.ipAddress || null,
      userAgent: auditContext.userAgent || null,
      appVersion: item.appVersion || null,
      kind,
      method: method || "geofence",
      outcome: "accepted",
      reason: flags.length > 0 ? flags.join(", ") : null,
      rawPayloadSnippet: JSON.stringify({ clientEventId, effectiveAt, timeTrust }),
      createdAt: new Date().toISOString(),
    });

    results.push({
      clientEventId,
      status: "accepted",
      effectiveAt,
      timeTrust,
    });

    touchedDates.add(localDate);
  }

  // Rebuild projections for each touched localDate
  for (const date of touchedDates) {
    await rebuildAttendanceDayProjection(staffId, date, sessionInstitutionId);
  }

  return {
    results,
    processedAt,
  };
}
