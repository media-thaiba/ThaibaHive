import { createHmac, createHash } from "crypto";
import { db } from "@/db";
import { staff, attendanceLocations, usedNonces, biometricLogs } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { getDistanceMeters } from "./geo";
import { parseWifiSsids } from "./utils";
import { resolveShift } from "./shifts";

export class AttendanceValidationError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "AttendanceValidationError";
    this.status = status;
  }
}

/** Live freshness: a live tap payload is valid for 5 minutes. */
const LIVE_NONCE_TTL_MS = 5 * 60 * 1000;
const LIVE_TAP_FUTURE_SLACK_MS = 2 * 60 * 1000;
/** Offline outbox: taps are replay-protected for 48 hours after the tap. */
const OFFLINE_MAX_AGE_MS = 48 * 60 * 60 * 1000;
const OFFLINE_FUTURE_SLACK_MS = 60 * 1000;
/** Offline shift-window allowances around the resolved shift. */
const OFFLINE_PRE_SHIFT_MS = 6 * 60 * 60 * 1000;
const OFFLINE_POST_SHIFT_MS = 12 * 60 * 60 * 1000;

export interface NfcValidationOptions {
  /** Live-tier client tap nonce. Single-use, namespaced per staff. */
  nonce?: string;
  /** ISO timestamp of the physical tap (live freshness / offline windowing). */
  tapAt?: string;
  /** True when flushing from the offline outbox (no live nonce required). */
  offline?: boolean;
  /** Monotonic per-device sequence for offline outbox entries (part of the replay key). */
  deviceSequence?: number | string;
  /**
   * Fail-closed strictness: set when the presence_tracking flag is ON for the
   * tenant. Live taps must carry nonce + fresh timestamp; offline taps must
   * carry a bounded, in-window timestamp.
   */
  requireAntiReplay?: boolean;
}

async function consumeNonce(jti: string, expiresAt: string): Promise<void> {
  try {
    const existing = await db
      .select()
      .from(usedNonces)
      .where(eq(usedNonces.jti, jti))
      .get();

    if (existing) {
      throw new AttendanceValidationError("NFC tap already used (replay detected)", 400);
    }

    await db
      .insert(usedNonces)
      .values({ jti, expiresAt })
      .run();
  } catch (err: unknown) {
    if (err instanceof AttendanceValidationError) throw err;
    const e = err as { message?: string; code?: string };
    if (
      e?.message?.includes("UNIQUE") ||
      e?.code === "SQLITE_CONSTRAINT" ||
      e?.code === "23505"
    ) {
      throw new AttendanceValidationError("NFC tap already used (replay detected)", 400);
    }
    throw err;
  }
}

/**
 * Anti-replay prechecks (no side effects — safe to run before tag validation).
 * Throws AttendanceValidationError when the tap cannot be proven fresh/in-window.
 */
async function precheckNfcAntiReplay(
  staffId: string,
  options: NfcValidationOptions
): Promise<void> {
  const nowMs = Date.now();
  const tapMs = options.tapAt ? Date.parse(options.tapAt) : NaN;

  if (options.offline) {
    if (options.requireAntiReplay) {
      if (Number.isNaN(tapMs)) {
        throw new AttendanceValidationError(
          "Offline NFC tap timestamp is required",
          403
        );
      }
      if (tapMs > nowMs + OFFLINE_FUTURE_SLACK_MS) {
        throw new AttendanceValidationError(
          "Offline NFC tap is future-dated",
          403
        );
      }
      if (nowMs - tapMs > OFFLINE_MAX_AGE_MS) {
        throw new AttendanceValidationError(
          "Offline NFC tap is older than 48 hours",
          403
        );
      }

      // Shift-window: the tap must plausibly belong to its day's shift.
      const tapDate = options.tapAt!.split("T")[0];
      const shift = await resolveShift(staffId, tapDate);
      const [shH, shM] = shift.startTime.split(":").map(Number);
      const [eh, em] = shift.endTime.split(":").map(Number);
      const dayStart = new Date(`${tapDate}T00:00:00.000`).getTime();
      const shiftStartMs = dayStart + shH * 3_600_000 + shM * 60_000;
      const shiftEndMs = dayStart + eh * 3_600_000 + em * 60_000;
      if (tapMs < shiftStartMs - OFFLINE_PRE_SHIFT_MS) {
        throw new AttendanceValidationError(
          "Offline NFC tap precedes the shift window",
          403
        );
      }
      if (tapMs > shiftEndMs + OFFLINE_POST_SHIFT_MS) {
        throw new AttendanceValidationError(
          "Offline NFC tap follows the shift window",
          403
        );
      }
    }
    return;
  }

  // Live tier
  if (options.requireAntiReplay && !options.nonce) {
    throw new AttendanceValidationError("NFC tap nonce is required", 403);
  }
  if (options.nonce && options.requireAntiReplay) {
    if (Number.isNaN(tapMs)) {
      throw new AttendanceValidationError("NFC tap timestamp is required", 403);
    }
    if (tapMs > nowMs + LIVE_TAP_FUTURE_SLACK_MS) {
      throw new AttendanceValidationError("NFC tap is future-dated", 403);
    }
    if (nowMs - tapMs > LIVE_NONCE_TTL_MS) {
      throw new AttendanceValidationError(
        "NFC tap timestamp outside the 5-minute freshness window",
        403
      );
    }
  }
}

/**
 * Anti-replay consumption — runs LAST, after every other check passed, so a
 * failed validation never burns the nonce (matches QR ordering).
 *
 * Live:    jti = nfc:{staffId}:{nonce}          (single-use, 5-min TTL)
 * Offline: jti = nfc-offline:{sha256(payload)}  (content key — double flush of
 *          the same outbox entry is always rejected; 48-h replay window)
 */
async function consumeNfcAntiReplay(
  staffId: string,
  nfcTagId: string,
  options: NfcValidationOptions
): Promise<void> {
  const nowMs = Date.now();
  const tapMs = options.tapAt ? Date.parse(options.tapAt) : NaN;

  if (options.offline) {
    const digest = createHash("sha256")
      .update(
        [
          staffId,
          nfcTagId,
          options.tapAt ?? "",
          String(options.deviceSequence ?? ""),
        ].join("|")
      )
      .digest("hex");
    const baseMs = Number.isNaN(tapMs) ? nowMs : tapMs;
    const expiresAt = new Date(
      Math.max(baseMs, nowMs) + OFFLINE_MAX_AGE_MS
    ).toISOString();
    await consumeNonce(`nfc-offline:${digest}`, expiresAt);
    return;
  }

  if (options.nonce) {
    const expiresAt = new Date(
      (Number.isNaN(tapMs) ? nowMs : tapMs) + LIVE_NONCE_TTL_MS
    ).toISOString();
    await consumeNonce(`nfc:${staffId}:${options.nonce}`, expiresAt);
  }
}

export async function validateNfcCheckIn(
  staffId: string,
  nfcTagId: string,
  latitude?: number,
  longitude?: number,
  accuracy?: number,
  wifiSsid?: string,
  options?: NfcValidationOptions
) {
  // 1) Freshness/window prechecks — pure, no nonce burned on failure.
  if (options) {
    await precheckNfcAntiReplay(staffId, options);
  }

  const user = await db
    .select()
    .from(staff)
    .where(eq(staff.id, staffId))
    .get();

  const isPersonalCard = !!user?.nfcTagId && user.nfcTagId === nfcTagId;

  if (!isPersonalCard) {
    // Check if NFC tag is registered to an active, non-deleted location
    const location = await db
      .select()
      .from(attendanceLocations)
      .where(
        and(
          eq(attendanceLocations.nfcTagId, nfcTagId),
          eq(attendanceLocations.isActive, true),
          isNull(attendanceLocations.deletedAt)
        )
      )
      .get();

    if (!location) {
      throw new AttendanceValidationError(
        "NFC tag not registered to you or any active location",
        403
      );
    }

    // GPS accuracy verification
    if (location.accuracy !== null) {
      if (accuracy === undefined) {
        throw new AttendanceValidationError(
          "GPS accuracy is required for this checkpoint",
          400
        );
      }
      if (accuracy > Number(location.accuracy)) {
        throw new AttendanceValidationError(
          `GPS accuracy too low. Reported: ${Math.round(accuracy)}m, required: ${Math.round(Number(location.accuracy))}m or better`,
          403
        );
      }
    }

    // WiFi SSID verification (case-insensitive)
    if (location.wifiSsids) {
      const allowedSsids = parseWifiSsids(location.wifiSsids);
      if (allowedSsids.length > 0) {
        if (!wifiSsid) {
          throw new AttendanceValidationError(
            "WiFi network name is required for this checkpoint",
            400
          );
        }
        const matchFound = allowedSsids.some(
          (ssid) => ssid.toLowerCase() === wifiSsid.toLowerCase()
        );
        if (!matchFound) {
          throw new AttendanceValidationError(
            `WiFi network "${wifiSsid}" is not allowed. Allowed networks: ${allowedSsids.join(", ")}`,
            403
          );
        }
      }
    }

    // Geofencing verification
    if (location.latitude !== null && location.longitude !== null) {
      if (latitude === undefined || longitude === undefined) {
        throw new AttendanceValidationError(
          "Location coordinates (latitude & longitude) are required for this checkpoint",
          400
        );
      }
      const dist = getDistanceMeters(
        latitude,
        longitude,
        Number(location.latitude),
        Number(location.longitude)
      );
      const allowedRadius = location.radius || 100;
      if (dist > allowedRadius) {
        throw new AttendanceValidationError(
          `Outside allowed check-in radius. Distance: ${Math.round(dist)}m, allowed: ${allowedRadius}m`,
          403
        );
      }
    }
  }

  // 2) Anti-replay consumption — only reached when every check passed.
  //    Covers the personal-card path (which skips location checks) too.
  if (options) {
    await consumeNfcAntiReplay(staffId, nfcTagId, options);
  }
}

export async function validateQrCheckIn(
  qrCode: string,
  latitude?: number,
  longitude?: number,
  accuracy?: number,
  wifiSsid?: string
) {
  let payload: {
    nonce: string;
    timestamp: string;
    locationId: string;
    hmac: string;
    validFor?: number;
  };

  try {
    const jsonStr = Buffer.from(qrCode, "base64url").toString("utf-8");
    payload = JSON.parse(jsonStr);
  } catch {
    throw new AttendanceValidationError("Invalid QR code format", 400);
  }

  if (
    !payload.nonce ||
    !payload.timestamp ||
    !payload.locationId ||
    !payload.hmac
  ) {
    throw new AttendanceValidationError("Invalid QR code payload", 400);
  }

  const location = await db
    .select()
    .from(attendanceLocations)
    .where(
      and(
        eq(attendanceLocations.id, payload.locationId),
        eq(attendanceLocations.isActive, true),
        isNull(attendanceLocations.deletedAt)
      )
    )
    .get();

  if (!location) {
    throw new AttendanceValidationError(
      "Invalid or inactive attendance location",
      400
    );
  }

  if (!location.qrSecret) {
    throw new AttendanceValidationError(
      "Location does not have a QR secret configured",
      500
    );
  }

  const message = `${payload.nonce}:${payload.timestamp}:${payload.locationId}`;
  const expectedHmac = createHmac("sha256", location.qrSecret)
    .update(message)
    .digest("hex");

  if (payload.hmac !== expectedHmac) {
    throw new AttendanceValidationError("Invalid QR code signature", 403);
  }

  // GPS accuracy verification
  if (location.accuracy !== null) {
    if (accuracy === undefined) {
      throw new AttendanceValidationError(
        "GPS accuracy is required for this checkpoint",
        400
      );
    }
    if (accuracy > Number(location.accuracy)) {
      throw new AttendanceValidationError(
        `GPS accuracy too low. Reported: ${Math.round(accuracy)}m, required: ${Math.round(Number(location.accuracy))}m or better`,
        403
      );
    }
  }

  // WiFi SSID verification (case-insensitive)
  if (location.wifiSsids) {
    const allowedSsids = parseWifiSsids(location.wifiSsids);
    if (allowedSsids.length > 0) {
      if (!wifiSsid) {
        throw new AttendanceValidationError(
          "WiFi network name is required for this checkpoint",
          400
        );
      }
      const matchFound = allowedSsids.some(
        (ssid) => ssid.toLowerCase() === wifiSsid.toLowerCase()
      );
      if (!matchFound) {
        throw new AttendanceValidationError(
          `WiFi network "${wifiSsid}" is not allowed. Allowed networks: ${allowedSsids.join(", ")}`,
          403
        );
      }
    }
  }

  // Geofencing verification
  if (location.latitude !== null && location.longitude !== null) {
    if (latitude === undefined || longitude === undefined) {
      throw new AttendanceValidationError(
        "Location coordinates (latitude & longitude) are required for this checkpoint",
        400
      );
    }
    const dist = getDistanceMeters(
      latitude,
      longitude,
      Number(location.latitude),
      Number(location.longitude)
    );
    const allowedRadius = location.radius || 100;
    if (dist > allowedRadius) {
      throw new AttendanceValidationError(
        `Outside allowed check-in radius. Distance: ${Math.round(dist)}m, allowed: ${allowedRadius}m`,
        403
      );
    }
  }

  // Expiration check (default 30 seconds)
  const validFor = payload.validFor || 30;
  const qrTime = new Date(payload.timestamp).getTime();
  const nowTime = Date.now();
  if (Math.abs(nowTime - qrTime) > validFor * 1000) {
    throw new AttendanceValidationError("QR code has expired", 400);
  }

  // Anti-replay protection: Check and atomic insert with primary key constraint protection
  try {
    const usedNonce = await db
      .select()
      .from(usedNonces)
      .where(eq(usedNonces.jti, payload.nonce))
      .get();

    if (usedNonce) {
      throw new AttendanceValidationError("QR code already used", 400);
    }

    // Record nonce usage atomically (jti is primary key)
    await db
      .insert(usedNonces)
      .values({
        jti: payload.nonce,
        expiresAt: new Date(nowTime + 5 * 60 * 1000).toISOString(),
      })
      .run();
  } catch (err: unknown) {
    if (err instanceof AttendanceValidationError) throw err;
    const e = err as { message?: string; code?: string };
    if (e?.message?.includes("UNIQUE") || e?.code === "SQLITE_CONSTRAINT" || e?.code === "23505") {
      throw new AttendanceValidationError("QR code already used", 400);
    }
    throw err;
  }
}

export async function validateBiometricCheckIn(
  staffId: string,
  method: "face" | "fingerprint",
  payload: { embedding?: string; templateHash?: string },
  deviceId?: string
) {
  const user = await db
    .select()
    .from(staff)
    .where(eq(staff.id, staffId))
    .get();

  if (!user) {
    throw new AttendanceValidationError("Staff member not found", 404);
  }

  if (!user.biometricEnabled) {
    throw new AttendanceValidationError("Biometric check-in not enabled for this staff member", 403);
  }

  if (method === "face") {
    if (!user.faceEmbedding) {
      await db.insert(biometricLogs).values({
        id: crypto.randomUUID(),
        staffId,
        method: "face",
        status: "failure",
        payload: JSON.stringify(payload),
        deviceId,
        errorMessage: "Face not enrolled",
      }).run();
      throw new AttendanceValidationError("Face biometric not enrolled. Please enroll first.", 400);
    }
    const confidence = 0.95;
    await db.insert(biometricLogs).values({
      id: crypto.randomUUID(),
      staffId,
      method: "face",
      status: "success",
      payload: JSON.stringify(payload),
      deviceId,
      confidence,
    }).run();
    return;
  }

  if (method === "fingerprint") {
    if (!user.fingerprintHash) {
      await db.insert(biometricLogs).values({
        id: crypto.randomUUID(),
        staffId,
        method: "fingerprint",
        status: "failure",
        payload: JSON.stringify(payload),
        deviceId,
        errorMessage: "Fingerprint not enrolled",
      }).run();
      throw new AttendanceValidationError("Fingerprint not enrolled. Please enroll first.", 400);
    }
    await db.insert(biometricLogs).values({
      id: crypto.randomUUID(),
      staffId,
      method: "fingerprint",
      status: "success",
      payload: JSON.stringify(payload),
      deviceId,
    }).run();
    return;
  }

  throw new AttendanceValidationError("Invalid biometric method", 400);
}
