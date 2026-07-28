import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { staffDeviceTokens, staffInstitutions, institutions } from "@/db/schema";
import { verifySession } from "@/lib/auth";
import { eq, sql } from "drizzle-orm";

const fcmTokenSchema = z.object({
  fcm_token: z.string().min(1, "FCM token is required"),
  platform: z.enum(["android", "ios", "web"], {
    message: "Platform must be android, ios, or web",
  }),
  device_name: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = fcmTokenSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { fcm_token, platform, device_name } = parsed.data;

    // Get staff's primary institution or fallback to default
    const staffInst = await db
      .select({ institutionId: staffInstitutions.institutionId })
      .from(staffInstitutions)
      .where(eq(staffInstitutions.staffId, session.staffId))
      .get();

    let institutionId = staffInst?.institutionId;
    if (!institutionId) {
      const defaultInst = await db.select({ id: institutions.id }).from(institutions).get();
      institutionId = defaultInst?.id || "default";
    }

    // Atomic ON CONFLICT upsert (reassigns staffId & institutionId if token exists)
    await db
      .insert(staffDeviceTokens)
      .values({
        id: crypto.randomUUID(),
        staffId: session.staffId,
        institutionId: institutionId,
        token: fcm_token,
        platform: platform,
        deviceName: device_name || null,
        lastUsedAt: sql`(current_timestamp)`,
      })
      .onConflictDoUpdate({
        target: staffDeviceTokens.token,
        set: {
          staffId: session.staffId,
          institutionId: institutionId,
          platform: platform,
          deviceName: device_name || null,
          lastUsedAt: sql`(current_timestamp)`,
        },
      });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("[API /auth/fcm-token] Error registering FCM token:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    let tokenToDelete: string | undefined;
    try {
      const body = await request.json();
      tokenToDelete = body?.fcm_token;
    } catch (_) {
      // Body may be empty on plain logout DELETE
    }

    if (tokenToDelete) {
      await db
        .delete(staffDeviceTokens)
        .where(
          sql`${staffDeviceTokens.staffId} = ${session.staffId} AND ${staffDeviceTokens.token} = ${tokenToDelete}`
        );
    } else {
      await db
        .delete(staffDeviceTokens)
        .where(eq(staffDeviceTokens.staffId, session.staffId));
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("[API /auth/fcm-token] Error deleting FCM token:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
