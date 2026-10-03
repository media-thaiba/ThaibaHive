import { db } from "@/db";
import { staffDeviceTokens, staffInstitutions } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

export const POST = requireAuth(async (request, session) => {
  const rateLimitResult = await checkRateLimit(`device-token:${session.staffId}`, {
    max: 5,
    windowMs: 60 * 1000,
  });

  if (!rateLimitResult.allowed) {
    return rateLimitResponse(rateLimitResult.resetMs);
  }

  const body = await request.json().catch(() => ({}));
  const { token, platform, deviceName } = body;

  if (!token || typeof token !== "string" || !token.trim()) {
    return Response.json({ error: "FCM registration token is required" }, { status: 400 });
  }

  const validPlatforms = ["android", "ios", "web"];
  const targetPlatform = validPlatforms.includes(platform) ? platform : "web";
  const now = new Date().toISOString();

  const staffInst = await db
    .select({ institutionId: staffInstitutions.institutionId })
    .from(staffInstitutions)
    .where(eq(staffInstitutions.staffId, session.staffId))
    .get();
  const institutionId = staffInst?.institutionId || "inst-1";

  // Check if token already exists (global unique constraint on token)
  const existing = await db
    .select({ id: staffDeviceTokens.id })
    .from(staffDeviceTokens)
    .where(eq(staffDeviceTokens.token, token.trim()))
    .get();

  if (existing) {
    // Reassign ownership to active session user on conflict
    await db
      .update(staffDeviceTokens)
      .set({
        staffId: session.staffId,
        institutionId,
        platform: targetPlatform,
        deviceName: deviceName ?? null,
        lastUsedAt: now,
      })
      .where(eq(staffDeviceTokens.token, token.trim()))
      .run();
  } else {
    // Insert new registration token
    await db
      .insert(staffDeviceTokens)
      .values({
        id: crypto.randomUUID(),
        staffId: session.staffId,
        institutionId,
        token: token.trim(),
        platform: targetPlatform,
        deviceName: deviceName ?? null,
        lastUsedAt: now,
        createdAt: now,
      })
      .run();
  }

  return Response.json({ success: true });
}, "notifications:update");


export const DELETE = requireAuth(async (request, session) => {
  const { searchParams } = new URL(request.url);
  const tokenParam = searchParams.get("token");

  if (tokenParam) {
    await db
      .delete(staffDeviceTokens)
      .where(
        and(
          eq(staffDeviceTokens.token, tokenParam.trim()),
          eq(staffDeviceTokens.staffId, session.staffId)
        )
      )
      .run();
  } else {
    await db
      .delete(staffDeviceTokens)
      .where(eq(staffDeviceTokens.staffId, session.staffId))
      .run();
  }

  return Response.json({ success: true });
}, "notifications:update");
