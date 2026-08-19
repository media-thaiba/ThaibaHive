import { NextResponse } from "next/server";
import { db } from "@/db";
import { nfcCards, nfcCardHistory, staff } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, desc, sql } from "drizzle-orm";
import crypto from "crypto";

export const GET = requireAuth(async (_request, _session, context) => {
  const { id } = await context!.params;

  const card = await db
    .select({
      id: nfcCards.id,
      tagId: nfcCards.tagId,
      status: nfcCards.status,
      ownerType: nfcCards.ownerType,
      ownerId: nfcCards.ownerId,
      issuedAt: nfcCards.issuedAt,
      issuedById: nfcCards.issuedById,
      lastCheckedAt: nfcCards.lastCheckedAt,
      notes: nfcCards.notes,
      createdAt: nfcCards.createdAt,
      updatedAt: nfcCards.updatedAt,
      assigneeName: sql`${staff.firstName} || ' ' || ${staff.lastName}`,
    })
    .from(nfcCards)
    .leftJoin(staff, eq(nfcCards.ownerId, staff.id))
    .where(eq(nfcCards.id, id))
    .get();

  if (!card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  const history = await db
    .select({
      id: nfcCardHistory.id,
      cardId: nfcCardHistory.cardId,
      action: nfcCardHistory.action,
      actorId: nfcCardHistory.actorId,
      targetStaffId: nfcCardHistory.targetStaffId,
      oldStatus: nfcCardHistory.oldStatus,
      newStatus: nfcCardHistory.newStatus,
      notes: nfcCardHistory.notes,
      createdAt: nfcCardHistory.createdAt,
    })
    .from(nfcCardHistory)
    .where(eq(nfcCardHistory.cardId, id))
    .orderBy(desc(nfcCardHistory.createdAt));

  return NextResponse.json({ card, history });
}, "nfc:admin");

export const PATCH = requireAuth(async (request: Request, _session, context) => {
  const { id } = await context!.params;
  const body = await request.json();
  const { status, notes } = body;

  if (status && !["available", "assigned", "lost", "retired"].includes(status)) {
    return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
  }

  const existing = await db
    .select({ id: nfcCards.id, status: nfcCards.status })
    .from(nfcCards)
    .where(eq(nfcCards.id, id))
    .get();

  if (!existing) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  const updateData: Record<string, string | null> = { updatedAt: new Date().toISOString() };
  if (status) updateData.status = status;
  if (notes !== undefined) updateData.notes = notes;

  const updated = await db
    .update(nfcCards)
    .set(updateData)
    .where(eq(nfcCards.id, id))
    .returning()
    .get();

  if (status && status !== existing.status) {
    await db.insert(nfcCardHistory).values({
      id: crypto.randomUUID(),
      cardId: id,
      action: "status_changed",
      oldStatus: existing.status,
      newStatus: status,
      createdAt: new Date().toISOString(),
    });
  }

  return NextResponse.json({ card: updated });
}, "nfc:admin");

export const DELETE = requireAuth(async (_request, _session, context) => {
  const { id } = await context!.params;

  const existing = await db
    .select({ id: nfcCards.id, status: nfcCards.status })
    .from(nfcCards)
    .where(eq(nfcCards.id, id))
    .get();

  if (!existing) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  const now = new Date().toISOString();
  await db
    .update(nfcCards)
    .set({ status: "retired", updatedAt: now })
    .where(eq(nfcCards.id, id));

  await db.insert(nfcCardHistory).values({
    id: crypto.randomUUID(),
    cardId: id,
    action: "retired",
    oldStatus: existing.status,
    newStatus: "retired",
    createdAt: now,
  });

  return NextResponse.json({ success: true });
}, "nfc:admin");
