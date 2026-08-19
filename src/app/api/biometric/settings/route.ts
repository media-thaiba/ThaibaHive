import { NextResponse } from "next/server";
import { db } from "@/db";
import { systemConfigs } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq } from "drizzle-orm";

const BIOMETRIC_SETTINGS_KEY = "biometric_policy";

export const GET = requireAuth(async () => {
  const row = await db
    .select()
    .from(systemConfigs)
    .where(eq(systemConfigs.key, BIOMETRIC_SETTINGS_KEY))
    .get();

  const settings = row ? JSON.parse(row.value) : {
    faceEnabled: true,
    fingerprintEnabled: true,
    requireLiveness: true,
    maxAttempts: 5,
    lockoutMinutes: 30,
  };

  return NextResponse.json({ settings });
}, "biometric:admin");

export const PUT = requireAuth(async (request: Request) => {
  const body = await request.json().catch(() => ({}));

  const now = new Date().toISOString();
  await db
    .insert(systemConfigs)
    .values({ key: BIOMETRIC_SETTINGS_KEY, value: JSON.stringify(body), updatedAt: now })
    .onConflictDoUpdate({ target: systemConfigs.key, set: { value: JSON.stringify(body), updatedAt: now } })
    .run();

  return NextResponse.json({ success: true, settings: body });
}, "biometric:admin");
