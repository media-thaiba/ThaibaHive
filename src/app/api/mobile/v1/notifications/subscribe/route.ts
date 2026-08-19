import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { PushNotificationService } from "@/lib/notifications/push-notification-service";
import { z } from "zod";

const pushSubscribeSchema = z.object({
  deviceToken: z.string().min(1, "deviceToken is required"),
  platform: z.enum(["ios", "android", "web"]),
});

export const POST = requireAuth(async (request: Request, session) => {
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parse = pushSubscribeSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: "Validation failed", details: parse.error.format() }, { status: 400 });
  }

  try {
    const subscription = await PushNotificationService.registerSubscription({
      userId: session.staffId,
      deviceToken: parse.data.deviceToken,
      platform: parse.data.platform,
    });

    return NextResponse.json({ subscription }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to register subscription" },
      { status: 500 }
    );
  }
});
