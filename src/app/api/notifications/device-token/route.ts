import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { staffDeviceTokens, staffInstitutions } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import {
  deviceTokenRegisterSchema,
  deviceTokenDeleteSchema,
} from "@/lib/validation/schemas";
import { eq, and } from "drizzle-orm";

export const POST = requireAuth(async (request, session) => {
  const rateLimitResult = checkRateLimit(`device-token:${session.staffId}`, {
    max: 10,
    windowMs: 60 * 1000,
  });

  if (!rateLimitResult.allowed) {
    return rateLimitResponse(rateLimitResult.resetMs);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = deviceTokenRegisterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request data" },
      { status: 400 }
    );
  }

  const { token, platform, deviceName } = parsed.data;
  const now = new Date().toISOString();

  const staffInst = await db
    .select({ institutionId: staffInstitutions.institutionId })
    .from(staffInstitutions)
    .where(eq(staffInstitutions.staffId, session.staffId))
    .get();
  const institutionId = staffInst?.institutionId || session.institutionId || "inst-1";

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
        platform,
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
        id: randomUUID(),
        staffId: session.staffId,
        institutionId,
        token: token.trim(),
        platform,
        deviceName: deviceName ?? null,
        lastUsedAt: now,
        createdAt: now,
      })
      .run();
  }

  return NextResponse.json({ success: true });
}, "notifications:update");

export const DELETE = requireAuth(async (request, session) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { searchParams } = new URL(request.url);
  const tokenParam = searchParams.get("token");

  if (tokenParam) {
    const parsed = deviceTokenDeleteSchema.safeParse({ token: tokenParam });
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid token" },
        { status: 400 }
      );
    }

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

  return NextResponse.json({ success: true });
}, "notifications:update");
