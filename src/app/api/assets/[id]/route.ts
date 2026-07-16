import { NextResponse } from "next/server";
import { db } from "@/db";
import { assets, staff, assetServiceHistory } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, desc, sql } from "drizzle-orm";

export const GET = requireAuth(async (_request, _session, context) => {
  const { id } = await context!.params;

  const asset = await db
    .select({
      id: assets.id,
      name: assets.name,
      type: assets.type,
      model: assets.model,
      serialNumber: assets.serialNumber,
      institutionId: assets.institutionId,
      assignedToId: assets.assignedToId,
      assignedToName: sql<string>`${staff.firstName} || ' ' || ${staff.lastName}`,
      location: assets.location,
      purchaseDate: assets.purchaseDate,
      purchaseCost: assets.purchaseCost,
      warrantyEnd: assets.warrantyEnd,
      status: assets.status,
      qrCode: assets.qrCode,
      notes: assets.notes,
      isActive: assets.isActive,
      createdAt: assets.createdAt,
      updatedAt: assets.updatedAt,
    })
    .from(assets)
    .leftJoin(staff, eq(assets.assignedToId, staff.id))
    .where(eq(assets.id, id))
    .get();

  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const serviceHistory = await db
    .select()
    .from(assetServiceHistory)
    .where(eq(assetServiceHistory.assetId, id))
    .orderBy(desc(assetServiceHistory.serviceDate))
    .all();

  return NextResponse.json({ asset, serviceHistory });
}, "assets:create");

export const PATCH = requireAuth(async (request: Request, _session, context) => {
  const { id } = await context!.params;

  const existing = await db.select().from(assets).where(eq(assets.id, id)).get();
  if (!existing) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const body = await request.json();
  const { name, type, model, serialNumber, institutionId, assignedToId, location, purchaseDate, purchaseCost, warrantyEnd, status, notes } = body;

  const updated = await db
    .update(assets)
    .set({
      ...(name !== undefined && { name }),
      ...(type !== undefined && { type }),
      ...(model !== undefined && { model }),
      ...(serialNumber !== undefined && { serialNumber }),
      ...(institutionId !== undefined && { institutionId }),
      ...(assignedToId !== undefined && { assignedToId }),
      ...(location !== undefined && { location }),
      ...(purchaseDate !== undefined && { purchaseDate }),
      ...(purchaseCost !== undefined && { purchaseCost: Number(purchaseCost) }),
      ...(warrantyEnd !== undefined && { warrantyEnd }),
      ...(status !== undefined && { status }),
      ...(notes !== undefined && { notes }),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(assets.id, id))
    .returning()
    .get();

  return NextResponse.json({ asset: updated });
}, "assets:update");

export const DELETE = requireAuth(async (_request, _session, context) => {
  const { id } = await context!.params;

  const existing = await db.select().from(assets).where(eq(assets.id, id)).get();
  if (!existing) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  await db
    .update(assets)
    .set({ isActive: false, updatedAt: new Date().toISOString() })
    .where(eq(assets.id, id))
    .run();

  return NextResponse.json({ success: true });
}, "assets:delete");
