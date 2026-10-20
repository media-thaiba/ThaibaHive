import { NextResponse } from "next/server";
import { db } from "@/db";
import { attendanceLocations } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { pick } from "@/lib/api/pick";
import { eq, and, ne, isNull } from "drizzle-orm";
import { logActivity } from "@/lib/api/activity-log";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { attendanceLocationUpdateSchema } from "@/lib/validation/schemas";
import { withLocationLock, getEffectiveInstitutionId } from "@/lib/attendance/locations/utils";

const UPDATABLE_FIELDS = [
  "name", "institutionId", "nfcTagId", "qrSecret", "isActive",
  "latitude", "longitude", "radius", "accuracy", "wifiSsids",
] as const;

export const PATCH = requireAuth(async (request: Request, session, context) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { id } = await context!.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = attendanceLocationUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  return await withLocationLock(id, async () => {
    const scopedInstitutionId = await getEffectiveInstitutionId(session);
    const whereClause = scopedInstitutionId && scopedInstitutionId !== "global"
      ? and(eq(attendanceLocations.id, id), eq(attendanceLocations.institutionId, scopedInstitutionId))
      : eq(attendanceLocations.id, id);

    const existing = await db.select().from(attendanceLocations).where(whereClause).get();
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updates = pick(parsed.data, UPDATABLE_FIELDS);

    // If existing is deleted and this request is not explicitly restoring it
    if (existing.deletedAt !== null && parsed.data.deletedAt !== null) {
      return NextResponse.json(
        { error: "Cannot update a deleted location. Explicitly restore it first." },
        { status: 400 }
      );
    }

    // Handle restore: clear deletedAt if explicitly set to null
    if (parsed.data.deletedAt === null) {
      const tagToCheck = updates.nfcTagId !== undefined ? updates.nfcTagId : existing.nfcTagId;
      if (tagToCheck) {
        const conflict = await db
          .select({ id: attendanceLocations.id })
          .from(attendanceLocations)
          .where(
            and(
              ne(attendanceLocations.id, id),
              eq(attendanceLocations.nfcTagId, tagToCheck),
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
    } else if (updates.nfcTagId && updates.nfcTagId !== existing.nfcTagId) {
      // Normal update changing nfcTagId: check for conflicts with other active locations
      const conflict = await db
        .select({ id: attendanceLocations.id })
        .from(attendanceLocations)
        .where(
          and(
            ne(attendanceLocations.id, id),
            eq(attendanceLocations.nfcTagId, updates.nfcTagId),
            isNull(attendanceLocations.deletedAt)
          )
        )
        .get();

      if (conflict) {
        return NextResponse.json(
          { error: "An active location with this NFC tag already exists." },
          { status: 409 }
        );
      }
    }

    // Ensure coordinate pair completeness with existing values
    const finalLat = updates.latitude !== undefined ? updates.latitude : existing.latitude;
    const finalLon = updates.longitude !== undefined ? updates.longitude : existing.longitude;
    if ((finalLat != null && finalLon == null) || (finalLat == null && finalLon != null)) {
      return NextResponse.json(
        { error: "Both latitude and longitude must be provided together" },
        { status: 400 }
      );
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
      .where(whereClause)
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
  });
}, "attendance:manage");

export const DELETE = requireAuth(async (request: Request, session, context) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { id } = await context!.params;

  return await withLocationLock(id, async () => {
    const scopedInstitutionId = await getEffectiveInstitutionId(session);
    const whereClause = scopedInstitutionId && scopedInstitutionId !== "global"
      ? and(eq(attendanceLocations.id, id), eq(attendanceLocations.institutionId, scopedInstitutionId))
      : eq(attendanceLocations.id, id);

    const existing = await db.select().from(attendanceLocations).where(whereClause).get();
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (existing.deletedAt !== null) {
      return NextResponse.json({ error: "Location is already deleted" }, { status: 400 });
    }

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
      .where(whereClause)
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
  });
}, "attendance:manage");
