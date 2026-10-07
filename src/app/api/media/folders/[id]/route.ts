import { NextResponse } from "next/server";
import { db } from "@/db";
import { mediaAssets, mediaFolders } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { resolveScopedInstitutionId } from "@/lib/auth";
import { deleteMediaObject } from "@/lib/media/asset-objects";
import { eq, and, inArray } from "drizzle-orm";

export const DELETE = requireAuth(async (req, session, ctx) => {
  try {
    const { id } = await ctx!.params;
    if (!id) {
      return NextResponse.json({ error: "Folder ID is required" }, { status: 400 });
    }

    // D9*: tenant scoping — scoped users must not learn of or delete another
    // institution's folders (cross-tenant → 404, same as asset routes).
    const institutionId = await resolveScopedInstitutionId(session.institutionId);
    const whereClause = institutionId && institutionId !== "global"
      ? and(eq(mediaFolders.id, id), eq(mediaFolders.institutionId, institutionId))
      : eq(mediaFolders.id, id);

    const folder = await db.select().from(mediaFolders).where(whereClause).get();
    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    // Collect descendant folder ids (BFS) so physical objects of children are
    // removed too — the DB cascade drops the rows, but the files would orphan.
    const folderIds: string[] = [folder.id];
    let frontier = [folder.id];
    while (frontier.length > 0) {
      const children = await db
        .select({ id: mediaFolders.id })
        .from(mediaFolders)
        .where(inArray(mediaFolders.parentId, frontier))
        .all();
      frontier = children.map((c) => c.id).filter((cid) => !folderIds.includes(cid));
      folderIds.push(...frontier);
    }

    const assets = await db
      .select({ fileUrl: mediaAssets.fileUrl, thumbnailUrl: mediaAssets.thumbnailUrl })
      .from(mediaAssets)
      .where(inArray(mediaAssets.folderId, folderIds))
      .all();

    for (const asset of assets) {
      await deleteMediaObject(asset.fileUrl);
      await deleteMediaObject(asset.thumbnailUrl);
    }

    // Deleting the root folder cascades child folders (parentId onDelete) and
    // their assets (folderId onDelete).
    await db.delete(mediaFolders).where(eq(mediaFolders.id, id)).run();

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete folder";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}, "media:manage");
