import { NextResponse } from "next/server";
import { db } from "@/db";
import { assets, staff, assetServiceHistory } from "@/db/schema";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { logActivity } from "@/lib/api/activity-log";
import { assetUpdateSchema } from "@/lib/validation/schemas";
import {
  withAssetLock,
  canAccessAsset,
  verifyStaffInstitutionAffiliation,
  isDecommissionedAsset,
} from "@/lib/assets/ledger";
import { eq, desc, sql, and } from "drizzle-orm";

export const GET = requireAuth(async (_request, session, context) => {
  const params = context?.params ? await context.params : {};
  const id = params.id;
  if (!id) return NextResponse.json({ error: "Asset ID is required" }, { status: 400 });

  const scopedInstId = await resolveRequestInstitution(session, null);

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

  // Cross-tenant and non-manager assignment IDOR check
  const allowed = canAccessAsset(asset, session, scopedInstId);
  if (!allowed) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const serviceHistory = await db
    .select()
    .from(assetServiceHistory)
    .where(eq(assetServiceHistory.assetId, id))
    .orderBy(desc(assetServiceHistory.serviceDate))
    .all();

  return NextResponse.json({ asset, serviceHistory });
}, "assets:read");

export const PATCH = requireAuth(async (request: Request, session, context) => {
  const params = context?.params ? await context.params : {};
  const id = params.id;
  if (!id) return NextResponse.json({ error: "Asset ID is required" }, { status: 400 });

  const scopedInstId = await resolveRequestInstitution(session, null);

  const existing = await db.select().from(assets).where(eq(assets.id, id)).get();
  if (!existing) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  if (scopedInstId !== "global" && existing.institutionId && existing.institutionId !== scopedInstId) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = assetUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateLimit = checkRateLimit(`assets:update:${session.staffId || ip}`, "write");
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  // Decommissioned guard: cannot update inactive/decommissioned asset without reactivating
  if (isDecommissionedAsset(existing) && !body.status && !body.isActive) {
    return NextResponse.json(
      { error: "Cannot modify a decommissioned or inactive asset without reactivating it" },
      { status: 400 }
    );
  }

  return withAssetLock(id, async () => {
    const { name, type, model, serialNumber, assignedToId, location, purchaseDate, purchaseCost, warrantyEnd, status, notes } = parsed.data;

    const resolvedInst = parsed.data.institutionId !== undefined
      ? await resolveRequestInstitution(session, parsed.data.institutionId)
      : existing.institutionId;
    const targetInstitutionId = resolvedInst === "global" ? null : resolvedInst || null;

    // Cross-tenant staff assignment check
    if (assignedToId && assignedToId !== existing.assignedToId) {
      const isAffiliated = await verifyStaffInstitutionAffiliation(assignedToId, targetInstitutionId);
      if (!isAffiliated) {
        return NextResponse.json(
          { error: "Assigned staff member does not exist or does not belong to this institution" },
          { status: 400 }
        );
      }
    }

    const now = new Date().toISOString();
    const updateData = {
      ...(name !== undefined && { name }),
      ...(type !== undefined && { type }),
      ...(model !== undefined && { model }),
      ...(serialNumber !== undefined && { serialNumber }),
      ...(targetInstitutionId !== undefined && { institutionId: targetInstitutionId }),
      ...(assignedToId !== undefined && { assignedToId }),
      ...(location !== undefined && { location }),
      ...(purchaseDate !== undefined && { purchaseDate }),
      ...(purchaseCost !== undefined && { purchaseCost }),
      ...(warrantyEnd !== undefined && { warrantyEnd }),
      ...(status !== undefined && { status }),
      ...(notes !== undefined && { notes }),
      ...(body.isActive !== undefined && { isActive: Boolean(body.isActive) }),
      updatedAt: now,
    };

    const updated = await db
      .update(assets)
      .set(updateData)
      .where(and(eq(assets.id, id), eq(assets.updatedAt, existing.updatedAt)))
      .returning()
      .get();

    if (!updated) {
      return NextResponse.json(
        { error: "Asset was modified concurrently by another process" },
        { status: 409 }
      );
    }

    await logActivity({
      request,
      action: "update",
      resourceType: "asset",
      resourceId: id,
      staffId: session.staffId,
      details: { previousStatus: existing.status, newStatus: updated.status, assignedToId: updated.assignedToId },
    });

    return NextResponse.json({ asset: updated });
  });
}, "assets:update");

export const DELETE = requireAuth(async (request: Request, session, context) => {
  const params = context?.params ? await context.params : {};
  const id = params.id;
  if (!id) return NextResponse.json({ error: "Asset ID is required" }, { status: 400 });

  const scopedInstId = await resolveRequestInstitution(session, null);

  const existing = await db.select().from(assets).where(eq(assets.id, id)).get();
  if (!existing) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  if (scopedInstId !== "global" && existing.institutionId && existing.institutionId !== scopedInstId) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  return withAssetLock(id, async () => {
    const updated = await db
      .update(assets)
      .set({
        isActive: false,
        status: "decommissioned",
        assignedToId: null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(assets.id, id))
      .returning()
      .get();

    await logActivity({
      request,
      action: "delete",
      resourceType: "asset",
      resourceId: id,
      staffId: session.staffId,
      details: { action: "decommission_asset", assetName: existing.name },
    });

    return NextResponse.json({ success: true, asset: updated });
  });
}, "assets:delete");
