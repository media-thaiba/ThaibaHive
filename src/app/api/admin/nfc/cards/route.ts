import { NextResponse } from "next/server";
import { db } from "@/db";
import { nfcCards, staff } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { getActorInstitutionIds } from "@/lib/api/tenant-scope";
import { eq, like, or, desc, count, and, sql } from "drizzle-orm";
import crypto from "crypto";

export const GET = requireAuth(async (request: Request) => {
  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "20", 10)));
  const status = url.searchParams.get("status");
  const search = url.searchParams.get("search")?.trim();
  const offset = (page - 1) * limit;

  const conditions: ReturnType<typeof eq | typeof like>[] = [];
  if (status && ["available", "assigned", "lost", "retired"].includes(status)) {
    conditions.push(eq(nfcCards.status, status));
  }

  const query = db
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
    .leftJoin(staff, eq(nfcCards.ownerId, staff.id));

  if (search) {
    query.where(
      and(
        ...conditions,
        or(
          like(nfcCards.tagId, `%${search}%`),
          like(staff.firstName, `%${search}%`),
          like(staff.lastName, `%${search}%`)
        )
      )
    );
  } else if (conditions.length > 0) {
    query.where(and(...conditions));
  }

  const cards = await query
    .orderBy(desc(nfcCards.createdAt))
    .limit(limit)
    .offset(offset);

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const [{ total }] = await db
    .select({ total: count() })
    .from(nfcCards)
    .where(whereClause);

  return NextResponse.json({ cards, total });
}, "nfc:admin");

export const POST = requireAuth(async (request: Request, session) => {
  const body = await request.json();
  const { tagId, notes, institutionId: requestedInstId, serialNumber } = body;

  if (!tagId || typeof tagId !== "string" || !tagId.trim()) {
    return NextResponse.json({ error: "tagId is required" }, { status: 400 });
  }
  if (!requestedInstId || typeof requestedInstId !== "string") {
    return NextResponse.json({ error: "institutionId is required" }, { status: 400 });
  }

  // Verify actor belongs to the institution they're minting a card for
  const actorInstitutionIds = await getActorInstitutionIds(session.staffId);
  if (!actorInstitutionIds.has(requestedInstId)) {
    return NextResponse.json(
      { error: "Forbidden: You do not belong to the specified institution." },
      { status: 403 }
    );
  }

  const cleanTagId = tagId.trim();

  const existing = await db
    .select({ id: nfcCards.id })
    .from(nfcCards)
    .where(eq(nfcCards.tagId, cleanTagId))
    .get();

  if (existing) {
    return NextResponse.json({ error: "A card with this tag ID already exists" }, { status: 409 });
  }

  const now = new Date().toISOString();
  const card = await db
    .insert(nfcCards)
    .values({
      id: crypto.randomUUID(),
      institutionId: requestedInstId,
      tagId: cleanTagId,
      serialNumber: serialNumber || null,
      ownerType: "staff",
      status: "available",
      notes: notes || null,
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .get();

  return NextResponse.json({ card }, { status: 201 });
}, "nfc:admin");
