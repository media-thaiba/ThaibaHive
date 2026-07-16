import { NextResponse } from "next/server";
import { db } from "@/db";
import { attendanceLocations } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { pick } from "@/lib/api/pick";
import { eq } from "drizzle-orm";

export const PATCH = requireAuth(async (request: Request, _session, context) => {
  const { id } = await context!.params;
  const body = await request.json();

  const existing = await db.select().from(attendanceLocations).where(eq(attendanceLocations.id, id)).get();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await db
    .update(attendanceLocations)
    .set({
      ...pick(body, ["name", "institutionId", "nfcTagId", "qrSecret", "isActive", "latitude", "longitude", "radius"]),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(attendanceLocations.id, id))
    .returning()
    .get();

  return NextResponse.json({ location: updated });
}, "attendance:manage");

export const DELETE = requireAuth(async (_request, _session, context) => {
  const { id } = await context!.params;

  const existing = await db.select().from(attendanceLocations).where(eq(attendanceLocations.id, id)).get();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.delete(attendanceLocations).where(eq(attendanceLocations.id, id)).run();
  return NextResponse.json({ success: true });
}, "attendance:manage");
