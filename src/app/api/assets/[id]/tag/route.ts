import { NextResponse } from "next/server";
import { db } from "@/db";
import { assets } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { logActivity } from "@/lib/api/activity-log";
import { eq, and, ne } from "drizzle-orm";

export const POST = requireAuth(async (request: Request, _session, context) => {
  const { id } = await context!.params;
  const body = await request.json().catch(() => ({}));
  const { barcode, qrCode, nfcTagId } = body as {
    barcode?: string;
    qrCode?: string;
    nfcTagId?: string;
  };

  if (!barcode && !qrCode && !nfcTagId) {
    return NextResponse.json(
      { error: "At least one identifier (barcode, qrCode, or nfcTagId) is required" },
      { status: 400 }
    );
  }

  const asset = await db.select().from(assets).where(eq(assets.id, id)).get();
  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const targetTag = qrCode || barcode || nfcTagId;

  // Collision check across other assets within the same tenant institution
  if (targetTag) {
    const existing = asset.institutionId
      ? await db
          .select()
          .from(assets)
          .where(and(eq(assets.institutionId, asset.institutionId), ne(assets.id, id), eq(assets.qrCode, targetTag)))
          .get()
      : await db
          .select()
          .from(assets)
          .where(and(ne(assets.id, id), eq(assets.qrCode, targetTag)))
          .get();

    if (existing) {
      return NextResponse.json(
        { error: "Tag or code is already assigned to another asset in this institution" },
        { status: 409 }
      );
    }
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
    staffId: _session.staffId,
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
}, "org:manage");
