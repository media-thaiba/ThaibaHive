import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { events, eventRsvps } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { eventRsvpSchema } from "@/lib/validation/schemas";
import { eq, and, sql } from "drizzle-orm";

export const POST = requireAuth(async (request: Request, session) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = eventRsvpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request data" },
      { status: 400 }
    );
  }

  const { eventId, status } = parsed.data;

  // 1. Verify Event Existence
  const targetEvent = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .get();

  if (!targetEvent) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  if (!targetEvent.isActive) {
    return NextResponse.json({ error: "Event is inactive or cancelled" }, { status: 400 });
  }

  // 2. Capacity Guard for 'attending' RSVPs
  if (status === "attending" && targetEvent.maxAttendees !== null && targetEvent.maxAttendees > 0) {
    const existingUserRsvp = await db
      .select({ id: eventRsvps.id, status: eventRsvps.status })
      .from(eventRsvps)
      .where(and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.staffId, session.staffId)))
      .get();

    // If user is not already 'attending', check capacity limit
    if (existingUserRsvp?.status !== "attending") {
      const attendingCountResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(eventRsvps)
        .where(and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.status, "attending")))
        .get();

      const currentCount = attendingCountResult?.count ?? 0;
      if (currentCount >= targetEvent.maxAttendees) {
        return NextResponse.json(
          { error: "Event has reached maximum attendee capacity" },
          { status: 400 }
        );
      }
    }
  }

  // 3. Upsert RSVP
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
      await db
        .insert(eventRsvps)
        .values({
          id: randomUUID(),
          eventId,
          staffId: session.staffId,
          status,
          respondedAt: new Date().toISOString(),
        })
        .run();
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        (error.message.includes("UNIQUE constraint") || error.message.includes("constraint failed"))
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

  return NextResponse.json({ success: true, status });
}, "events:read");
