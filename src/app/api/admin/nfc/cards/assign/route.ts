import { NextResponse } from "next/server";
import { db } from "@/db";
import { nfcCards, nfcCardHistory, staff, students } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { logActivity } from "@/lib/api/activity-log";
import { getActorInstitutionIds,  } from "@/lib/api/tenant-scope";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

export const POST = requireAuth(async (request: Request, session) => {
  const body = await request.json();
  const { cardId, ownerType = "staff", ownerId: rawOwnerId, staffId, studentId } = body;

  const targetOwnerId = rawOwnerId || (ownerType === "student" ? studentId : staffId);

  if (!cardId || typeof cardId !== "string") {
    return NextResponse.json({ error: "cardId is required" }, { status: 400 });
  }
  if (!targetOwnerId || typeof targetOwnerId !== "string") {
    return NextResponse.json({ error: "ownerId (or staffId/studentId) is required" }, { status: 400 });
  }
  if (!["staff", "student"].includes(ownerType)) {
    return NextResponse.json({ error: "ownerType must be 'staff' or 'student'" }, { status: 400 });
  }

  // Derive actor's institution set server-side — session carries no institutionId
  const actorInstitutionIds = await getActorInstitutionIds(session.staffId);

  // 1. Retrieve Card & verify card belongs to one of actor's institutions
  const card = await db
    .select({
      id: nfcCards.id,
      tagId: nfcCards.tagId,
      status: nfcCards.status,
      institutionId: nfcCards.institutionId,
    })
    .from(nfcCards)
    .where(eq(nfcCards.id, cardId))
    .get();

  if (!card) {
    return NextResponse.json({ error: "NFC card not found" }, { status: 404 });
  }

  // Actor must own the card's institution
  if (!actorInstitutionIds.has(card.institutionId)) {
    return NextResponse.json(
      { error: "Forbidden: Card does not belong to your institution." },
      { status: 403 }
    );
  }

  // 2. Lookup Target Owner & verify institution alignment
  let ownerName = "";
  let targetInstitutionId: string;

  if (ownerType === "staff") {
    const targetStaff = await db
      .select({
        id: staff.id,
        firstName: staff.firstName,
        lastName: staff.lastName,
      })
      .from(staff)
      .where(eq(staff.id, targetOwnerId))
      .get();

    if (!targetStaff) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }
    ownerName = `${targetStaff.firstName} ${targetStaff.lastName}`.trim();

    // Resolve staff's institution membership via junction table
    const targetStaffInstitutionIds = await getActorInstitutionIds(targetOwnerId);
    if (!targetStaffInstitutionIds.has(card.institutionId)) {
      return NextResponse.json(
        { error: "Tenant mismatch: Staff member does not belong to the card's institution." },
        { status: 409 }
      );
    }
    targetInstitutionId = card.institutionId; // confirmed same institution
  } else {
    const targetStudent = await db
      .select({
        id: students.id,
        firstName: students.firstName,
        lastName: students.lastName,
        institutionId: students.institutionId,
      })
      .from(students)
      .where(eq(students.id, targetOwnerId))
      .get();

    if (!targetStudent) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }
    ownerName = `${targetStudent.firstName} ${targetStudent.lastName}`.trim();
    targetInstitutionId = targetStudent.institutionId;
  }

  // Card and target owner must share the same institution
  if (card.institutionId !== targetInstitutionId) {
    return NextResponse.json(
      { error: "Tenant mismatch: Card belongs to a different institution than the target entity." },
      { status: 409 }
    );
  }

  const now = new Date().toISOString();

  // 3. Atomic Assignment Transaction with status filter guard
  try {
    await db.transaction(async (tx) => {
      // Only proceeds if card is STILL 'available' at execution time (race-safe)
      const updated = await tx
        .update(nfcCards)
        .set({
          status: "assigned",
          ownerType,
          ownerId: targetOwnerId,
          issuedById: session.staffId,
          issuedAt: now,
          updatedAt: now,
        })
        .where(and(eq(nfcCards.id, cardId), eq(nfcCards.status, "available")))
        .returning({ id: nfcCards.id });

      if (updated.length === 0) {
        throw new Error("Card assignment failed: Card is no longer available or was assigned concurrently.");
      }

      // Update denormalized nfcTagId on owner row (same transaction)
      if (ownerType === "staff") {
        await tx
          .update(staff)
          .set({ nfcTagId: card.tagId })
          .where(eq(staff.id, targetOwnerId));
      } else {
        await tx
          .update(students)
          .set({ nfcTagId: card.tagId, updatedAt: now })
          .where(eq(students.id, targetOwnerId));
      }

      await tx.insert(nfcCardHistory).values({
        id: crypto.randomUUID(),
        cardId,
        action: "assigned",
        actorId: session.staffId,
        targetStaffId: ownerType === "staff" ? targetOwnerId : null,
        oldStatus: "available",
        newStatus: "assigned",
        createdAt: now,
      });
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to assign card";
    return NextResponse.json({ error: message }, { status: 409 });
  }

  await logActivity({
    request,
    staffId: session.staffId,
    action: "NFC_CARD_ASSIGNED",
    resourceType: "nfc_card",
    resourceId: cardId,
    details: { tagId: card.tagId, ownerType, ownerId: targetOwnerId },
  });

  return NextResponse.json({
    success: true,
    cardId,
    ownerType,
    ownerId: targetOwnerId,
    ownerName,
    tagId: card.tagId,
  });
}, "nfc:assign");
