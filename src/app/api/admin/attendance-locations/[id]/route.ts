import { NextResponse } from "next/server";
import { db } from "@/db";
import { attendanceLocations } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { pick } from "@/lib/api/pick";
import { eq, and, isNull } from "drizzle-orm";
import { logActivity } from "@/lib/api/activity-log";

const UPDATABLE_FIELDS = [
  "name", "institutionId", "nfcTagId", "qrSecret", "isActive",
  "latitude", "longitude", "radius", "accuracy", "wifiSsids",
] as const;

export const PATCH = requireAuth(async (request: Request, session, context) => {
  const { id } = await context!.params;
  const body = await request.json();

  const existing = await db.select().from(attendanceLocations).where(eq(attendanceLocations.id, id)).get();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updates = pick(body, UPDATABLE_FIELDS);

  // Handle restore: clear deletedAt if explicitly set to null
  if ("deletedAt" in body && body.deletedAt === null) {
    // Collision guard: check if another active location already uses this NFC tag
    if (updates.nfcTagId && updates.nfcTagId !== existing.nfcTagId) {
      const conflict = await db
        .select()
        .from(attendanceLocations)
        .where(
          and(
            eq(attendanceLocations.nfcTagId, updates.nfcTagId),
            isNull(attendanceLocations.deletedAt)
          )
        )
        .get();
      if (conflict) {
        return NextResponse.json(
          { error: "Tag ID conflict. Please clear or change the tag ID on the active location before restoring." },
          { status: 409 }
        );
      }
    }
    // If restoring without changing nfcTagId, check if the existing tag conflicts
    if (!updates.nfcTagId && existing.nfcTagId) {
      const conflict = await db
        .select()
        .from(attendanceLocations)
        .where(
          and(
            eq(attendanceLocations.nfcTagId, existing.nfcTagId),
            isNull(attendanceLocations.deletedAt)
          )
        )
        .get();
      if (conflict) {
        return NextResponse.json(
          { error: "Tag ID conflict. Please clear or change the tag ID on the active location before restoring." },
          { status: 409 }
        );
      }
    }
    (updates as Record<string, unknown>).deletedAt = null;
  }

  // Calculate field diff for audit logging
  const diff: Record<string, { from: unknown; to: unknown }> = {};
  for (const field of UPDATABLE_FIELDS) {
    if (field in updates) {
      const oldVal = existing[field as keyof typeof existing];
      const newVal = updates[field];
      if (oldVal !== newVal) {
        diff[field] = { from: oldVal, to: newVal };
      }
    }
  }

  const updated = await db
    .update(attendanceLocations)
    .set({
      ...updates,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(attendanceLocations.id, id))
    .returning()
    .get();

  if (Object.keys(diff).length > 0) {
    await logActivity({
      request,
      staffId: session.staffId,
      action: "UPDATE_LOCATION",
      resourceType: "attendance_location",
      resourceId: id,
      details: diff,
    });
  }

  return NextResponse.json({ location: updated });
}, "attendance:manage");

export const DELETE = requireAuth(async (request: Request, session, context) => {
  const { id } = await context!.params;

  const existing = await db.select().from(attendanceLocations).where(eq(attendanceLocations.id, id)).get();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Snapshot before update (must run before nfcTagId is nulled)
  const snapshot = {
    name: existing.name,
    nfcTagId: existing.nfcTagId,
    wifiSsids: existing.wifiSsids,
    accuracy: existing.accuracy,
  };

  // Soft-delete: set deletedAt and null out nfcTagId to free the physical tag
  const now = new Date().toISOString();
  await db
    .update(attendanceLocations)
    .set({
      deletedAt: now,
      nfcTagId: null,
      updatedAt: now,
    })
    .where(eq(attendanceLocations.id, id))
    .run();

  await logActivity({
    request,
    staffId: session.staffId,
    action: "DELETE_LOCATION",
    resourceType: "attendance_location",
    resourceId: id,
    details: snapshot,
  });

  return NextResponse.json({ success: true });
}, "attendance:manage");
