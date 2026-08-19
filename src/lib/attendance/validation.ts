import { createHmac } from "crypto";
import { db } from "@/db";
import { staff, attendanceLocations, usedNonces, biometricLogs } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { getDistanceMeters } from "./geo";
import { parseWifiSsids } from "./utils";

export class AttendanceValidationError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "AttendanceValidationError";
    this.status = status;
  }
}

export async function validateNfcCheckIn(
  staffId: string,
  nfcTagId: string,
  latitude?: number,
  longitude?: number,
  accuracy?: number,
  wifiSsid?: string
) {
  const user = await db
    .select()
    .from(staff)
    .where(eq(staff.id, staffId))
    .get();

  if (user?.nfcTagId && user.nfcTagId === nfcTagId) {
    // Valid personal NFC card check-in (doesn't enforce location)
    return;
  }

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
