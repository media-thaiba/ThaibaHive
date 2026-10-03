import { requireAuth } from "@/lib/api/auth-guard";
import { sendToConnection, connectionCount } from "@/lib/api/realtime";
import { z } from "zod";

const broadcastSchema = z.object({
  userId: z.string().min(1),
  channel: z.string().min(1).default("notification"),
  data: z.record(z.string(), z.unknown()).default({}),
});

export const POST = requireAuth(async (request, session) => {
  const body = await request.json();
  const parsed = broadcastSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { userId, channel, data } = parsed.data;

  // Authorization: admins/super_admins can target anyone; standard users only themselves
  const isAdmin = session.role === "super_admin" || session.role === "admin";
  if (!isAdmin && userId !== session.staffId) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const targetKey = `notification-${userId}`;
  const count = connectionCount(targetKey);

  sendToConnection(targetKey, channel, data);

  return Response.json({ delivered: count });
}, "notifications:update");
