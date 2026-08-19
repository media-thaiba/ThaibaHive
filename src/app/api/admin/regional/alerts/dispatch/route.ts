import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { PushNotificationService } from "@/lib/notifications/push-notification-service";
import { pushAlertDispatchSchema } from "@/lib/validation/schemas";

export const POST = requireAuth(async (request: Request) => {
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parse = pushAlertDispatchSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: "Validation failed", details: parse.error.format() }, { status: 400 });
  }

  try {
    const result = await PushNotificationService.dispatchAlert(parse.data);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to dispatch push alert" },
      { status: 500 }
    );
  }
}, "alerts:push_configure");
