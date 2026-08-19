import { NextResponse } from "next/server";
import { db } from "@/db";
import { nfcCards, staff } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, sql } from "drizzle-orm";

export const POST = requireAuth(async (request: Request) => {
  const body = await request.json();
  const { tagId } = body;

  if (!tagId || typeof tagId !== "string" || !tagId.trim()) {
    return NextResponse.json({ error: "tagId is required" }, { status: 400 });
  }

  const cleanTagId = tagId.trim();

  const card = await db
    .select({
      id: nfcCards.id,
      tagId: nfcCards.tagId,
      status: nfcCards.status,
      ownerType: nfcCards.ownerType,
      ownerId: nfcCards.ownerId,
      issuedAt: nfcCards.issuedAt,
      notes: nfcCards.notes,
      createdAt: nfcCards.createdAt,
      assigneeName: sql`${staff.firstName} || ' ' || ${staff.lastName}`,
      assigneeEmployeeId: staff.employeeId,
      assigneeEmail: staff.email,
    })
    .from(nfcCards)
    .leftJoin(staff, eq(nfcCards.ownerId, staff.id))
    .where(eq(nfcCards.tagId, cleanTagId))
    .get();

  if (!card) {
    return NextResponse.json({ card: null, message: "No card found with this tag ID" });
  }

  return NextResponse.json({ card });
}, "nfc:admin");
