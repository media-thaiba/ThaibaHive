import { NextResponse } from "next/server";
import { db } from "@/db";
import { nfcCards, nfcCardHistory, staff } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { resolveScopedInstitutionId } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

export const GET = requireAuth(async (_request, session, context) => {
  const rl = checkRateLimit(session.staffId, "read");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { id } = await context!.params;

  if (session.staffId !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const scopedInstitutionId = await resolveScopedInstitutionId(session.institutionId);
  const conditions = [
    eq(nfcCards.ownerType, "staff"),
    eq(nfcCards.ownerId, id),
    eq(nfcCards.status, "assigned"),
  ];
  if (scopedInstitutionId && scopedInstitutionId !== "global") {
    conditions.push(eq(nfcCards.institutionId, scopedInstitutionId));
  }

  const card = await db
    .select({
      id: nfcCards.id,
      tagId: nfcCards.tagId,
      status: nfcCards.status,
      issuedAt: nfcCards.issuedAt,
      lastCheckedAt: nfcCards.lastCheckedAt,
      notes: nfcCards.notes,
    })
    .from(nfcCards)
    .where(and(...conditions))
    .get();

  return NextResponse.json({ card: card || null });
}, "staff:update");

export const POST = requireAuth(async (request: Request, session, context) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { id } = await context!.params;

  if (session.staffId !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const { tagId } = (body as { tagId?: unknown }) || {};

  if (!tagId || typeof tagId !== "string" || !tagId.trim() || tagId.trim().length > 100) {
    return NextResponse.json({ error: "Valid tagId (max 100 chars) is required" }, { status: 400 });
  }

  const cleanTagId = tagId.trim();
  const scopedInstitutionId = await resolveScopedInstitutionId(session.institutionId);

  const lookupConditions = [eq(nfcCards.tagId, cleanTagId)];
  if (scopedInstitutionId && scopedInstitutionId !== "global") {
    lookupConditions.push(eq(nfcCards.institutionId, scopedInstitutionId));
  }

  const card = await db
    .select({
      id: nfcCards.id,
      tagId: nfcCards.tagId,
      status: nfcCards.status,
      ownerType: nfcCards.ownerType,
      ownerId: nfcCards.ownerId,
    })
    .from(nfcCards)
    .where(and(...lookupConditions))
    .get();

  if (!card) {
    return NextResponse.json({ error: "No NFC card found with this tag ID" }, { status: 404 });
  }

  if (card.status === "retired") {
    return NextResponse.json({ error: "This NFC card has been retired" }, { status: 409 });
  }

  if (card.status === "assigned" && (card.ownerType !== "staff" || card.ownerId !== id)) {
    return NextResponse.json({ error: "This NFC card is already assigned to another user" }, { status: 409 });
  }

  if (card.status === "lost") {
    return NextResponse.json({ error: "This NFC card has been reported as lost" }, { status: 409 });
  }

  const now = new Date().toISOString();

  await db.transaction(async (tx) => {
    const updateConditions = [eq(nfcCards.id, card.id)];
    if (scopedInstitutionId && scopedInstitutionId !== "global") {
      updateConditions.push(eq(nfcCards.institutionId, scopedInstitutionId));
    }

    await tx
      .update(nfcCards)
      .set({
        status: "assigned",
        ownerType: "staff",
        ownerId: id,
        issuedById: id,
        issuedAt: now,
        lastCheckedAt: now,
        updatedAt: now,
      })
      .where(and(...updateConditions));

    await tx
      .update(staff)
      .set({ nfcTagId: cleanTagId })
      .where(eq(staff.id, id));

    await tx.insert(nfcCardHistory).values({
      id: crypto.randomUUID(),
      cardId: card.id,
      action: card.ownerId === id ? "reassigned" : "assigned",
      actorId: id,
      targetStaffId: id,
      oldStatus: card.status,
      newStatus: "assigned",
      createdAt: now,
    });
  });

  return NextResponse.json({ success: true, cardId: card.id, tagId: cleanTagId });
}, "staff:update");

export const DELETE = requireAuth(async (request: Request, session, context) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { id } = await context!.params;

  if (session.staffId !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const { reason } = (body as { reason?: string }) || {};

  if (!reason || typeof reason !== "string" || !reason.trim() || reason.trim().length > 500) {
    return NextResponse.json({ error: "A valid reason (max 500 chars) is required to unlink NFC card" }, { status: 400 });
  }

  const scopedInstitutionId = await resolveScopedInstitutionId(session.institutionId);
  const deleteConditions = [
    eq(nfcCards.ownerType, "staff"),
    eq(nfcCards.ownerId, id),
    eq(nfcCards.status, "assigned"),
  ];
  if (scopedInstitutionId && scopedInstitutionId !== "global") {
    deleteConditions.push(eq(nfcCards.institutionId, scopedInstitutionId));
  }

  const card = await db
    .select({ id: nfcCards.id, tagId: nfcCards.tagId, status: nfcCards.status })
    .from(nfcCards)
    .where(and(...deleteConditions))
    .get();

  if (!card) {
    return NextResponse.json({ error: "No assigned NFC card found" }, { status: 404 });
  }

  const now = new Date().toISOString();

  await db.transaction(async (tx) => {
    const cardConditions = [eq(nfcCards.id, card.id)];
    if (scopedInstitutionId && scopedInstitutionId !== "global") {
      cardConditions.push(eq(nfcCards.institutionId, scopedInstitutionId));
    }

    await tx
      .update(nfcCards)
      .set({
        status: "available",
        ownerType: "staff",
        ownerId: null,
        issuedById: null,
        issuedAt: null,
        lastCheckedAt: now,
        updatedAt: now,
      })
      .where(and(...cardConditions));

    await tx
      .update(staff)
      .set({ nfcTagId: null })
      .where(eq(staff.id, id));

    await tx.insert(nfcCardHistory).values({
      id: crypto.randomUUID(),
      cardId: card.id,
      action: "unlinked",
      actorId: id,
      targetStaffId: id,
      oldStatus: "assigned",
      newStatus: "available",
      notes: reason.trim(),
      createdAt: now,
    });
  });

  return NextResponse.json({ success: true, message: "NFC card unlinked" });
}, "staff:update");
