import { NextResponse } from "next/server";
import { db } from "@/db";
import { mediaFolders } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { mediaFolderCreateSchema } from "@/lib/validation/schemas";
import { eq, asc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export const GET = requireAuth(async (req) => {
  try {
    const { searchParams } = new URL(req.url);
    const parentId = searchParams.get("parentId");

    let query = db.select().from(mediaFolders).$dynamic();
    if (parentId) {
      query = query.where(eq(mediaFolders.parentId, parentId));
    }
    
    const allFolders = await query.orderBy(asc(mediaFolders.name)).all();
    return NextResponse.json({ folders: allFolders });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch folders";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}, "media:read");

export const POST = requireAuth(async (req, session) => {
  try {
    const body = await req.json();
    const result = mediaFolderCreateSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ error: "Invalid data", details: result.error.flatten() }, { status: 400 });
    }
    
    const { name, parentId, departmentId } = result.data;
    const id = uuidv4();
    
    const newFolder = await db.insert(mediaFolders).values({
      id,
      name,
      parentId: parentId || null,
      departmentId: departmentId || null,
      createdById: session!.staffId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).returning().get();
    
    return NextResponse.json({ folder: newFolder }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create folder";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}, "media:create");
