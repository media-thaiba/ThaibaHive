import { createHmac } from "crypto";
import { db } from "@/db";
import { staff, attendanceLocations, usedNonces } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getDistanceMeters } from "./geo";

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
  longitude?: number
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

  // Check if NFC tag is registered to an active location
  const location = await db
    .select()
    .from(attendanceLocations)
    .where(
      and(
        eq(attendanceLocations.nfcTagId, nfcTagId),
        eq(attendanceLocations.isActive, true)
      )
    )
    .get();

  if (!location) {
    throw new AttendanceValidationError(
      "NFC tag not registered to you or any active location",
      403
    );
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
  longitude?: number
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
        eq(attendanceLocations.isActive, true)
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

  // Anti-replay protection
  const usedNonce = await db
    .select()
    .from(usedNonces)
    .where(eq(usedNonces.jti, payload.nonce))
    .get();

  if (usedNonce) {
    throw new AttendanceValidationError("QR code already used", 400);
  }

  // Record nonce usage
  await db
    .insert(usedNonces)
    .values({
      jti: payload.nonce,
      expiresAt: new Date(nowTime + 5 * 60 * 1000).toISOString(),
    })
    .run();
}
