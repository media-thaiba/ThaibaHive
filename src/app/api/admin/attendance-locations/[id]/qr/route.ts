import { NextResponse } from "next/server";
import { db } from "@/db";
import { attendanceLocations } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq } from "drizzle-orm";
import { createHmac, randomBytes } from "crypto";

export const GET = requireAuth(async (_request, _session, context) => {
  const { id } = await context!.params;

  const location = await db.select().from(attendanceLocations).where(eq(attendanceLocations.id, id)).get();
  if (!location) return NextResponse.json({ error: "Not found" }, { status: 404 });
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
