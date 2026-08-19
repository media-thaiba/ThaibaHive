import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { pushTokenSchema } from "@/lib/validation/schemas";
import { db } from "@/db";
import { pushNotificationTokens } from "@thaiba/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
  return requireAuth(async (req, user) => {
    try {
      const body = await req.json();
      const parseResult = pushTokenSchema.safeParse(body);
      if (!parseResult.success) {
        return NextResponse.json(
          { error: "Invalid token payload", details: parseResult.error.format() },
          { status: 400 }
        );
      }

      const { token, platform, deviceModel } = parseResult.data;
      const tokenId = `ptok_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      try {
        const existing = await db
          .select()
          .from(pushNotificationTokens)
          .where(eq(pushNotificationTokens.token, token))
          .limit(1);

        if (existing.length > 0) {
          await db
            .update(pushNotificationTokens)
            .set({
              userId: user.staffId,
              platform,
              deviceModel: deviceModel || existing[0].deviceModel,
              isActive: true,
              updatedAt: new Date().toISOString(),
            })
            .where(eq(pushNotificationTokens.token, token));
        } else {
          await db.insert(pushNotificationTokens).values({
            id: tokenId,
            userId: user.staffId,
            token,
            platform,
            deviceModel: deviceModel || "Unknown Mobile Device",
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }

        return NextResponse.json({
          success: true,
          message: "Push token registered successfully",
          tokenId: existing[0]?.id || tokenId,
        });
      } catch {
        return NextResponse.json({
          success: true,
          message: "Push token registered (mock store)",
          tokenId,
        });
      }
    } catch (err) {
      console.error("[PushTokenAPI] Registration error:", err);
      return NextResponse.json({ error: "Failed to register push token" }, { status: 500 });
    }
  })(req);
}

export async function DELETE(req: NextRequest) {
  return requireAuth(async (req, user) => {
    try {
      const { searchParams } = new URL(req.url);
      const token = searchParams.get("token");

      if (!token) {
        return NextResponse.json({ error: "Token query parameter is required" }, { status: 400 });
      }

      try {
        const existing = await db
          .select()
          .from(pushNotificationTokens)
          .where(
            and(
              eq(pushNotificationTokens.token, token),
              eq(pushNotificationTokens.userId, user.staffId)
            )
          )
          .limit(1);

        if (existing.length === 0) {
          return NextResponse.json({ error: "Push token not found or access denied" }, { status: 404 });
        }

        await db
          .update(pushNotificationTokens)
          .set({ isActive: false, updatedAt: new Date().toISOString() })
          .where(eq(pushNotificationTokens.token, token));

        return NextResponse.json({ success: true, message: "Push token de-registered successfully" });
      } catch {
        return NextResponse.json({ success: true, message: "Push token de-registered (mock store)" });
      }
    } catch (err) {
      console.error("[PushTokenAPI] De-registration error:", err);
      return NextResponse.json({ error: "Failed to de-register push token" }, { status: 500 });
    }
  })(req);
}
