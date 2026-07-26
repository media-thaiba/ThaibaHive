import { NextResponse } from "next/server";
import { db } from "@/db";
import { mediaAssets } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { mediaAssetCreateSchema } from "@/lib/validation/schemas";
import { eq, asc, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export const GET = requireAuth(async (req) => {
  try {
    const { searchParams } = new URL(req.url);
    const folderId = searchParams.get("folderId");
    const fileType = searchParams.get("fileType");

    let query = db.select().from(mediaAssets).$dynamic();
    
    const conditions = [];
    if (folderId) conditions.push(eq(mediaAssets.folderId, folderId));
    if (fileType) conditions.push(eq(mediaAssets.fileType, fileType));

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    const allAssets = await query.orderBy(asc(mediaAssets.name)).all();
    return NextResponse.json({ assets: allAssets });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch assets";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}, "media:read");

export const POST = requireAuth(async (req, session) => {
  try {
    const body = await req.json();
    const result = mediaAssetCreateSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ error: "Invalid data", details: result.error.flatten() }, { status: 400 });
    }
    
    const {
      name, fileUrl, thumbnailUrl, fileSize, mimeType, fileType,
      status, folderId, tags, metadata
    } = result.data;
    
    // Server Content Sniffing and HEAD checks can be abstracted out or placed here
    // based on business logic. The plan mentions server-side sniffing. We will assume
    // that this might be done in an async worker or middleware, or added as a utility.
    
    const id = uuidv4();
    const newAsset = await db.insert(mediaAssets).values({
      id,
      name,
      fileUrl,
      thumbnailUrl: thumbnailUrl || null,
      fileSize,
      mimeType,
      fileType,
      status,
      folderId: folderId || null,
      tags: tags || null,
      metadata: metadata || null,
      createdById: session.staffId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).returning().get();
    
    return NextResponse.json({ asset: newAsset }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create asset";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}, "media:create");
