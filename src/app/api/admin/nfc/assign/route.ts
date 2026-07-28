import { NextResponse } from "next/server";
import { db } from "@/db";
import { staff, attendanceLocations, staffInstitutions } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { logActivity } from "@/lib/api/activity-log";
import { ensureArray } from "@/lib/utils";
import { eq, isNull, and } from "drizzle-orm";
import crypto from "crypto";

// 15-minute TTL Idempotency Store: Map<`${staffId}:${clientRequestId}`, { hash: string, response: any, expiresAt: number }>
type IdempotencyRecord = { hash: string; response: unknown; expiresAt: number };
const idempotencyStore = new Map<string, IdempotencyRecord>();

function cleanExpiredIdempotencyKeys() {
  const now = Date.now();
  for (const [key, record] of idempotencyStore.entries()) {
    if (now > record.expiresAt) {
      idempotencyStore.delete(key);
    }
  }
}

export const POST = requireAuth(async (request: Request, session) => {
  cleanExpiredIdempotencyKeys();

  const body = await request.json();
  const {
    type,
    targetId,
    nfcTagId,
    forceReassign,
    expectedCurrentOwnerId,
    clientRequestId,
  } = body;

  // Idempotency check
  if (clientRequestId && typeof clientRequestId === "string") {
    const idempotencyKey = `${session.staffId}:${clientRequestId}`;
    const bodyHash = crypto.createHash("sha256").update(JSON.stringify(body)).digest("hex");
    const existingRecord = idempotencyStore.get(idempotencyKey);

    if (existingRecord) {
      if (existingRecord.hash !== bodyHash) {
        return NextResponse.json(
          { error: "clientRequestId reused with mismatched parameters" },
          { status: 409 }
        );
      }
      return NextResponse.json(existingRecord.response, { status: 200 });
    }
  }

  // Schema validations
  if (!type || !["staff", "location"].includes(type)) {
    return NextResponse.json(
      { error: "type must be 'staff' or 'location'" },
      { status: 400 }
    );
  }

  if (!targetId || typeof targetId !== "string") {
    return NextResponse.json(
      { error: "targetId is required" },
      { status: 400 }
    );
  }

  const cleanTagId = typeof nfcTagId === "string" ? nfcTagId.trim() : "";
  if (!cleanTagId) {
    return NextResponse.json(
      { error: "nfcTagId is required" },
      { status: 400 }
    );
  }

  if (forceReassign === true && !expectedCurrentOwnerId) {
    return NextResponse.json(
      { error: "expectedCurrentOwnerId is required when forceReassign is true" },
      { status: 400 }
    );
  }

  // Tenant check for requester
  const isSuperAdmin = session.role === "super_admin";
  const userInsts = await db
    .select({ institutionId: staffInstitutions.institutionId })
    .from(staffInstitutions)
    .where(eq(staffInstitutions.staffId, session.staffId));
  const userInstsArray = ensureArray<{ institutionId: string }>(userInsts);
  const userInstitutionIds = new Set(userInstsArray.map((i) => i.institutionId));

  // Verify target existence and tenant ownership
  let targetInstitutionId: string | null = null;
  let targetName = "";

  if (type === "staff") {
    const targetStaff = await db
      .select({ id: staff.id, firstName: staff.firstName, lastName: staff.lastName })
      .from(staff)
      .where(eq(staff.id, targetId))
      .get();

    if (!targetStaff) {
      return NextResponse.json({ error: "Target staff member not found" }, { status: 404 });
    }

    targetName = `${targetStaff.firstName} ${targetStaff.lastName}`.trim();
    const staffInst = await db
      .select({ institutionId: staffInstitutions.institutionId })
      .from(staffInstitutions)
      .where(eq(staffInstitutions.staffId, targetId))
      .get();
    targetInstitutionId = staffInst?.institutionId || null;

    if (!isSuperAdmin && targetInstitutionId && !userInstitutionIds.has(targetInstitutionId)) {
      return NextResponse.json({ error: "Forbidden: target belongs to another organization" }, { status: 403 });
    }
  } else {
    const targetLoc = await db
      .select({ id: attendanceLocations.id, name: attendanceLocations.name, institutionId: attendanceLocations.institutionId })
      .from(attendanceLocations)
      .where(and(eq(attendanceLocations.id, targetId), isNull(attendanceLocations.deletedAt)))
      .get();

    if (!targetLoc) {
      return NextResponse.json({ error: "Target location not found" }, { status: 404 });
    }

    targetName = targetLoc.name;
    targetInstitutionId = targetLoc.institutionId;

    if (!isSuperAdmin && targetInstitutionId && !userInstitutionIds.has(targetInstitutionId)) {
      return NextResponse.json({ error: "Forbidden: target belongs to another organization" }, { status: 403 });
    }
  }

  // Find existing owner of cleanTagId
  const existingStaffOwner = await db
    .select({ id: staff.id, firstName: staff.firstName, lastName: staff.lastName })
    .from(staff)
    .where(eq(staff.nfcTagId, cleanTagId))
    .get();

  const existingLocOwner = await db
    .select({ id: attendanceLocations.id, name: attendanceLocations.name, institutionId: attendanceLocations.institutionId })
    .from(attendanceLocations)
    .where(and(eq(attendanceLocations.nfcTagId, cleanTagId), isNull(attendanceLocations.deletedAt)))
    .get();

  let existingOwner: { id: string; name: string; type: "staff" | "location"; institutionId: string | null } | null = null;

  if (existingStaffOwner && existingStaffOwner.id !== targetId) {
    const sInst = await db
      .select({ institutionId: staffInstitutions.institutionId })
      .from(staffInstitutions)
      .where(eq(staffInstitutions.staffId, existingStaffOwner.id))
      .get();

    existingOwner = {
      id: existingStaffOwner.id,
      name: `${existingStaffOwner.firstName} ${existingStaffOwner.lastName}`.trim(),
      type: "staff",
      institutionId: sInst?.institutionId || null,
    };
  } else if (existingLocOwner && existingLocOwner.id !== targetId) {
    existingOwner = {
      id: existingLocOwner.id,
      name: existingLocOwner.name,
      type: "location",
      institutionId: existingLocOwner.institutionId,
    };
  }

  // Handle collision if tag belongs elsewhere
  if (existingOwner) {
    const isSameTenant =
      isSuperAdmin ||
      (existingOwner.institutionId ? userInstitutionIds.has(existingOwner.institutionId) : true);

    if (!isSameTenant) {
      await logActivity({
        request,
        staffId: session.staffId,
        action: "ADMIN_NFC_COLLISION_ATTEMPT",
        resourceType: type === "staff" ? "staff" : "attendance_location",
        resourceId: targetId,
        details: { cleanTagId, isSameTenant: false },
      });

      return NextResponse.json(
        { error: "NFC tag is registered to another organization", isSameTenant: false },
        { status: 409 }
      );
    }

    // Same tenant collision
    if (!forceReassign) {
      await logActivity({
        request,
        staffId: session.staffId,
        action: "ADMIN_NFC_COLLISION_ATTEMPT",
        resourceType: type === "staff" ? "staff" : "attendance_location",
        resourceId: targetId,
        details: { cleanTagId, isSameTenant: true, existingOwnerId: existingOwner.id },
      });

      return NextResponse.json(
        {
          error: "NFC tag is already assigned",
          isSameTenant: true,
          owner: {
            id: existingOwner.id,
            name: existingOwner.name,
            type: existingOwner.type,
          },
        },
        { status: 409 }
      );
    }

    // Force reassign requested — optimistic concurrency check
    if (expectedCurrentOwnerId !== existingOwner.id) {
      return NextResponse.json(
        { error: "NFC tag owner has changed since last scan", isSameTenant: true },
        { status: 409 }
      );
    }
  }

  // Perform assignment in transaction
  try {
    await db.transaction(async (tx) => {
      // Clear tag from previous owner if reassigning
      if (existingOwner) {
        if (existingOwner.type === "staff") {
          await tx.update(staff).set({ nfcTagId: null }).where(eq(staff.id, existingOwner.id));
        } else {
          await tx.update(attendanceLocations).set({ nfcTagId: null }).where(eq(attendanceLocations.id, existingOwner.id));
        }
      }

      // Assign tag to target
      if (type === "staff") {
        await tx.update(staff).set({ nfcTagId: cleanTagId }).where(eq(staff.id, targetId));
      } else {
        await tx.update(attendanceLocations).set({ nfcTagId: cleanTagId }).where(eq(attendanceLocations.id, targetId));
      }
    });

    const responsePayload = {
      success: true,
      assigned: {
        type,
        targetId,
        targetName,
        nfcTagId: cleanTagId,
        reassignedFrom: existingOwner ? existingOwner.id : null,
      },
    };

    await logActivity({
      request,
      staffId: session.staffId,
      action: existingOwner ? "ADMIN_NFC_REASSIGN" : "ADMIN_NFC_ASSIGN",
      resourceType: type === "staff" ? "staff" : "attendance_location",
      resourceId: targetId,
      details: { nfcTagId: cleanTagId, reassignedFrom: existingOwner?.id || null },
    });

    if (clientRequestId && typeof clientRequestId === "string") {
      const idempotencyKey = `${session.staffId}:${clientRequestId}`;
      const bodyHash = crypto.createHash("sha256").update(JSON.stringify(body)).digest("hex");
      idempotencyStore.set(idempotencyKey, {
        hash: bodyHash,
        response: responsePayload,
        expiresAt: Date.now() + 15 * 60 * 1000,
      });
    }

    return NextResponse.json(responsePayload, { status: 200 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    if (errorMsg.includes("UNIQUE") || errorMsg.includes("unique")) {
      return NextResponse.json({ error: "NFC tag already in use", isSameTenant: true }, { status: 409 });
    }
    throw err;
  }
}, "org:manage");
