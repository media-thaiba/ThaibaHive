import { NextResponse } from "next/server";
import { db } from "@/db";
import { eventRsvps } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, and } from "drizzle-orm";

const ALLOWED_STATUSES = ["attending", "maybe", "declined"];

export const POST = requireAuth(async (request: Request, session) => {
  const body = await request.json();
  const { eventId, status } = body;

  if (!eventId || !status) {
    return NextResponse.json({ error: "Event ID and status required" }, { status: 400 });
  }

  if (!ALLOWED_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid RSVP status" }, { status: 400 });
  }

  const existing = await db
    .select()
    .from(eventRsvps)
    .where(and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.staffId, session.staffId)))
    .get();

  if (existing) {
    await db
      .update(eventRsvps)
      .set({ status, respondedAt: new Date().toISOString() })
      .where(eq(eventRsvps.id, existing.id))
      .run();
  } else {
    try {
      await db.insert(eventRsvps).values({
        id: crypto.randomUUID(),
        eventId,
        staffId: session.staffId,
        status,
      }).run();
    } catch (error: unknown) {
      if (
        error instanceof Error && (
          error.message.includes("UNIQUE constraint") ||
          error.message.includes("constraint failed")
        )
      ) {
        await db
          .update(eventRsvps)
          .set({ status, respondedAt: new Date().toISOString() })
          .where(and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.staffId, session.staffId)))
          .run();
      } else {
        throw error;
      }
    }
  }

  return NextResponse.json({ success: true });
}, "events:read");