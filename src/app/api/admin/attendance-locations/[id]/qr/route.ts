import { NextResponse } from "next/server";
import { db } from "@/db";
import { attendanceLocations } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, and, isNull } from "drizzle-orm";
import { createHmac, randomBytes } from "crypto";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { getEffectiveInstitutionId } from "@/lib/attendance/locations/utils";

export const GET = requireAuth(async (_request, session, context) => {
  const rl = checkRateLimit(session.staffId, "read");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { id } = await context!.params;
  const scopedInstId = await getEffectiveInstitutionId(session);

  const location = await db
    .select()
    .from(attendanceLocations)
    .where(and(eq(attendanceLocations.id, id), isNull(attendanceLocations.deletedAt)))
    .get();
  if (!location) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (scopedInstId && scopedInstId !== "global" && location.institutionId !== scopedInstId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!location.isActive) return NextResponse.json({ error: "Location is inactive" }, { status: 400 });

  const nonce = randomBytes(32).toString("base64url");
  const timestamp = new Date().toISOString();
  const message = `${nonce}:${timestamp}:${location.id}`;
  const hmac = createHmac("sha256", location.qrSecret).update(message).digest("hex");

  const payload = {
    nonce,
    timestamp,
    locationId: location.id,
    hmac,
    validFor: 30,
  };

  const qrString = Buffer.from(JSON.stringify(payload)).toString("base64url");

  return NextResponse.json({ qr: qrString, payload });
}, "attendance:manage");
