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
    await db.insert(eventRsvps).values({
      id: crypto.randomUUID(),
      eventId,
      staffId: session.staffId,
      status,
    }).run();
  }

  return NextResponse.json({ success: true });
}, "events:read");