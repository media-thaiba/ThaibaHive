import { requireAuth } from "@/lib/api/auth-guard";
import { db } from "@/db";
import { presence } from "@thaiba/db/schema";
import { logActivity } from "@/lib/api/activity-log";
import { broadcastPresence } from "@/lib/api/realtime";
import { z } from "zod";

const statusSchema = z.object({
  status: z.enum(["active", "busy", "meeting", "away"]),
  statusText: z.string().max(120).optional(),
  durationMinutes: z.union([z.number().int().min(1).max(1440), z.literal("eod")]).optional(),
  expiresAt: z.string().optional(),
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

  const now = new Date();
  const nowIso = now.toISOString();
  let computedExpiresAt: string | null = null;

  if (parsed.data.status !== "active") {
    if (parsed.data.durationMinutes === "eod") {
      const eod = new Date(now);
      eod.setHours(18, 0, 0, 0);
      if (eod.getTime() <= now.getTime()) {
        eod.setHours(23, 59, 59, 999);
      }
      computedExpiresAt = eod.toISOString();
    } else if (typeof parsed.data.durationMinutes === "number") {
      computedExpiresAt = new Date(now.getTime() + parsed.data.durationMinutes * 60 * 1000).toISOString();
    } else if (parsed.data.expiresAt) {
      computedExpiresAt = new Date(parsed.data.expiresAt).toISOString();
    }
  }

  await db
    .insert(presence)
    .values({
      staffId: session.staffId,
      online: true,
      lastSeenAt: nowIso,
      status: parsed.data.status,
      statusText: parsed.data.statusText ?? null,
      expiresAt: computedExpiresAt,
      updatedAt: nowIso,
    })
    .onConflictDoUpdate({
      target: presence.staffId,
      set: {
        status: parsed.data.status,
        statusText: parsed.data.statusText ?? null,
        expiresAt: computedExpiresAt,
        updatedAt: nowIso,
      },
    });

  await logActivity({
    request,
    staffId: session.staffId,
    action: "UPDATE_STATUS",
    resourceType: "presence",
    details: {
      status: parsed.data.status,
      statusText: parsed.data.statusText,
      expiresAt: computedExpiresAt,
    },
  });

  try {
    broadcastPresence(session.staffId, true, nowIso, parsed.data.status, parsed.data.statusText ?? null);
  } catch (err) {
    console.error("Failed to broadcast status update:", err);
  }

  return Response.json({ ok: true, status: parsed.data.status, expiresAt: computedExpiresAt });
}, "availability:write");
