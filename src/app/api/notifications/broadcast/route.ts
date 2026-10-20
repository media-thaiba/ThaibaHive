import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { sendToConnection, connectionCount } from "@/lib/api/realtime";
import { notificationBroadcastSchema } from "@/lib/validation/schemas";

export const POST = requireAuth(async (request, session) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = notificationBroadcastSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request body" },
      { status: 400 }
    );
  }

  const { userId, channel, data } = parsed.data;

  // Authorization: admins/super_admins can target anyone; standard users only themselves
  const isAdmin = session.role === "super_admin" || session.role === "admin";
  if (!isAdmin && userId !== session.staffId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const targetKey = `notification-${userId}`;
  const count = connectionCount(targetKey);

  sendToConnection(targetKey, channel, data);

  return NextResponse.json({ delivered: count });
}, "notifications:update");
