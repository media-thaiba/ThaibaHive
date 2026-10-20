import { NextResponse } from "next/server";
import { db } from "@/db";
import { assets, assetServiceHistory } from "@/db/schema";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { logActivity } from "@/lib/api/activity-log";
import { assetServiceCreateSchema } from "@/lib/validation/schemas";
import { withAssetLock, canAccessAsset, isDecommissionedAsset } from "@/lib/assets/ledger";
import { eq, desc } from "drizzle-orm";

export const GET = requireAuth(async (_request, session, context) => {
  const params = context?.params ? await context.params : {};
  const id = params.id;
  if (!id) return NextResponse.json({ error: "Asset ID is required" }, { status: 400 });

  const scopedInstId = await resolveRequestInstitution(session, null);

  const asset = await db.select().from(assets).where(eq(assets.id, id)).get();
  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  // Cross-tenant & IDOR assignment check
  const allowed = canAccessAsset(asset, session, scopedInstId);
  if (!allowed) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const records = await db
    .select()
    .from(assetServiceHistory)
    .where(eq(assetServiceHistory.assetId, id))
    .orderBy(desc(assetServiceHistory.serviceDate))
    .all();

  return NextResponse.json({ serviceHistory: records });
}, "assets:read");

export const POST = requireAuth(async (request: Request, session, context) => {
  const params = context?.params ? await context.params : {};
  const id = params.id;
  if (!id) return NextResponse.json({ error: "Asset ID is required" }, { status: 400 });

  const scopedInstId = await resolveRequestInstitution(session, null);

  const asset = await db.select().from(assets).where(eq(assets.id, id)).get();
  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  if (scopedInstId !== "global" && asset.institutionId && asset.institutionId !== scopedInstId) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  if (isDecommissionedAsset(asset)) {
    return NextResponse.json(
      { error: "Cannot create service records for an inactive or decommissioned asset" },
      { status: 400 }
    );
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateLimit = checkRateLimit(`assets:service:${session.staffId || ip}`, "write");
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = assetServiceCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { serviceDate, description, cost, servicedBy, notes } = parsed.data;

  return withAssetLock(id, async () => {
    const record = await db
      .insert(assetServiceHistory)
      .values({
        id: crypto.randomUUID(),
        assetId: id,
        serviceDate,
        description,
        cost: cost ?? null,
        servicedBy: servicedBy || session.staffId || null,
        notes: notes || null,
      })
      .returning()
      .get();

    // Mark asset updatedAt and under maintenance if applicable
    await db
      .update(assets)
      .set({
        status: asset.status === "available" ? "under_maintenance" : asset.status,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(assets.id, id))
      .run();

    await logActivity({
      request,
      action: "create",
      resourceType: "asset_service_record",
      resourceId: record.id,
      staffId: session.staffId,
      details: { assetId: id, serviceDate, cost },
    });

    return NextResponse.json({ serviceRecord: record }, { status: 201 });
  });
}, "assets:update");
