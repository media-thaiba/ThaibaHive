import { requireAuth } from "@/lib/api/auth-guard";
import { db } from "@/db";
import { presence } from "@thaiba/db/schema";
import { logActivity } from "@/lib/api/activity-log";
import { broadcastPresence } from "@/lib/api/realtime";
import { z } from "zod";

const statusSchema = z.object({
  status: z.enum(["active", "busy", "meeting", "away"]),
  statusText: z.string().max(120).optional(),
});

export const POST = requireAuth(async (request, session) => {
  const body = await request.json();
  const parsed = statusSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();

  await db
    .insert(presence)
    .values({
      staffId: session.staffId,
      online: true,
      lastSeenAt: now,
      status: parsed.data.status,
      statusText: parsed.data.statusText ?? null,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: presence.staffId,
      set: {
        status: parsed.data.status,
        statusText: parsed.data.statusText ?? null,
        updatedAt: now,
      },
    });

  await logActivity({
    request,
    staffId: session.staffId,
    action: "UPDATE_STATUS",
    resourceType: "presence",
    details: { status: parsed.data.status, statusText: parsed.data.statusText },
  });

  try {
    broadcastPresence(session.staffId, true, now, parsed.data.status, parsed.data.statusText ?? null);
  } catch (err) {
    console.error("Failed to broadcast status update:", err);
  }

  return Response.json({ ok: true });
}, "availability:write");
