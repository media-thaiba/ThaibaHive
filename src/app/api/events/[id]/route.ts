import { NextResponse } from "next/server";
import { db } from "@/db";
import { events, eventRsvps } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq } from "drizzle-orm";

export const DELETE = requireAuth(async (_request, _session, context) => {
  const { id } = await context!.params;
  const existing = await db.select({ id: events.id }).from(events).where(eq(events.id, id)).get();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.delete(eventRsvps).where(eq(eventRsvps.eventId, id)).run();
  await db.delete(events).where(eq(events.id, id)).run();
  return NextResponse.json({ success: true });
}, "events:manage");
