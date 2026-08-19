import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";

export const POST = requireAuth(async (request: Request, session) => {
  try {
    let body: { fcmToken?: string; deviceType?: string } = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (!body.fcmToken) {
      return NextResponse.json({ error: "fcmToken is required" }, { status: 400 });
    }

    // FCM token registration logic
    return NextResponse.json({
      success: true,
      registeredAt: new Date().toISOString(),
      staffId: session.staffId,
      deviceType: body.deviceType || "unknown",
    });
  } catch (error) {
    console.error("FCM Token registration error:", error);
    return NextResponse.json({ error: "Failed to register push token" }, { status: 500 });
  }
});
