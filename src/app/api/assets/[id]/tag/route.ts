import { NextResponse } from "next/server";
import { db } from "@/db";
import { assets } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { resolveScopedInstitutionId } from "@/lib/auth";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { logActivity } from "@/lib/api/activity-log";
import { assetTagBindSchema } from "@/lib/validation/schemas";
import { withAssetLock, isDecommissionedAsset } from "@/lib/assets/ledger";
import { eq, and, ne } from "drizzle-orm";

export const POST = requireAuth(async (request: Request, session, context) => {
  const params = context?.params ? await context.params : {};
  let id = params.id;
  if (!id) {
    const url = new URL(request.url);
    const parts = url.pathname.split("/").filter(Boolean);
    id = parts[parts.length - 2] || parts[parts.length - 1];
  }
  if (!id) return NextResponse.json({ error: "Asset ID is required" }, { status: 400 });

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = assetTagBindSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { barcode, qrCode, nfcTagId } = parsed.data;
  const targetTag = qrCode || barcode || nfcTagId;
  if (!targetTag) {
    return NextResponse.json(
      { error: "At least one identifier (barcode, qrCode, or nfcTagId) is required" },
      { status: 400 }
    );
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateLimit = checkRateLimit(`assets:tag:${session.staffId || ip}`, "write");
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const scopedInstId = await resolveScopedInstitutionId(session.institutionId);

  const asset = await db.select().from(assets).where(eq(assets.id, id)).get();
  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  if (scopedInstId && scopedInstId !== "global" && asset.institutionId && asset.institutionId !== scopedInstId) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  if (isDecommissionedAsset(asset)) {
    return NextResponse.json(
      { error: "Cannot bind tags to an inactive or decommissioned asset" },
      { status: 400 }
    );
  }

  return withAssetLock(id, async () => {
    // Collision check across other assets within the same tenant institution
    const existing = asset.institutionId
      ? await db
          .select({ id: assets.id })
          .from(assets)
          .where(
            and(
              eq(assets.institutionId, asset.institutionId),
              ne(assets.id, id),
              eq(assets.qrCode, targetTag),
              eq(assets.isActive, true)
            )
          )
          .get()
      : await db
          .select({ id: assets.id })
          .from(assets)
          .where(and(ne(assets.id, id), eq(assets.qrCode, targetTag), eq(assets.isActive, true)))
          .get();

    if (existing) {
      return NextResponse.json(
        { error: "Tag or code is already assigned to another active asset in this institution" },
        { status: 409 }
      );
    }

    const updated = await db
      .update(assets)
      .set({
        qrCode: targetTag || asset.qrCode,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(assets.id, id))
      .returning()
      .get();

    await logActivity({
      request,
      staffId: session.staffId,
      action: "ADMIN_ASSET_TAG_BIND",
      resourceType: "asset",
      resourceId: id,
      details: {
        barcode,
        qrCode,
        nfcTagId,
        assetName: asset.name,
      },
    });

    return NextResponse.json({ success: true, asset: updated });
  });
}, "assets:update");
