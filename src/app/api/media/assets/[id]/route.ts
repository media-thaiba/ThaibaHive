import { NextResponse } from "next/server";
import { db } from "@/db";
import { mediaAssets } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq } from "drizzle-orm";

export const DELETE = requireAuth(async (req, session, ctx) => {
  try {
    const { id } = await ctx!.params;
    if (!id) {
      return NextResponse.json({ error: "Asset ID is required" }, { status: 400 });
    }

    const asset = await db.select().from(mediaAssets).where(eq(mediaAssets.id, id)).get();
    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    // In a full implementation, you would also delete the physical file from storage here.
    
    await db.delete(mediaAssets).where(eq(mediaAssets.id, id)).run();

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete asset";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}, "media:manage");
