import { NextResponse } from "next/server";
import { db } from "@/db";
import { events, eventRsvps } from "@/db/schema";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { resolveScopedInstitutionId } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export const DELETE = requireAuth(async (_request, session, context) => {
  const { id } = await context!.params;
  const institutionId = await resolveScopedInstitutionId(session.institutionId);

  const whereClause = institutionId && institutionId !== "global"
    ? and(eq(events.id, id), eq(events.institutionId, institutionId))
    : eq(events.id, id);

  const existing = await db.select({ id: events.id }).from(events).where(whereClause).get();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.delete(eventRsvps).where(eq(eventRsvps.eventId, id)).run();
  await db.delete(events).where(whereClause).run();
  return NextResponse.json({ success: true });
}, "events:manage");
