import { NextResponse } from "next/server";
import { db } from "@/db";
import { mediaFolders } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq } from "drizzle-orm";

export const DELETE = requireAuth(async (req, session, ctx) => {
  try {
    const { id } = await ctx!.params;
    if (!id) {
      return NextResponse.json({ error: "Folder ID is required" }, { status: 400 });
    }

    const folder = await db.select().from(mediaFolders).where(eq(mediaFolders.id, id)).get();
    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    await db.delete(mediaFolders).where(eq(mediaFolders.id, id)).run();

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete folder";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}, "media:manage");
