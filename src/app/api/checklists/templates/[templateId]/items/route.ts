import { NextResponse } from "next/server";
import { db } from "@/db";
import { checklistTemplateItems } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq } from "drizzle-orm";

export const POST = requireAuth(async (request: Request, _session, context) => {
  const { templateId } = await context!.params;
  const body = await request.json();
  const { title, description, order } = body;

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const item = await db
    .insert(checklistTemplateItems)
    .values({
      id: crypto.randomUUID(),
      templateId,
      title,
      description,
      order: order ?? 0,
    })
    .returning()
    .get();

  return NextResponse.json({ item }, { status: 201 });
}, "org:manage");

export const PATCH = requireAuth(async (request: Request) => {
  const body = await request.json();
  const { id, title, description, order } = body;

  if (!id) {
    return NextResponse.json({ error: "Item id is required" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (order !== undefined) updates.order = order;

  const item = await db
    .update(checklistTemplateItems)
    .set(updates)
    .where(eq(checklistTemplateItems.id, id))
    .returning()
    .get();

  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ item });
}, "org:manage");

export const DELETE = requireAuth(async (request: Request) => {
  const body = await request.json();
  const { id } = body;

  if (!id) {
    return NextResponse.json({ error: "Item id is required" }, { status: 400 });
  }

  const item = await db
    .delete(checklistTemplateItems)
    .where(eq(checklistTemplateItems.id, id))
    .returning()
    .get();

  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}, "org:manage");
