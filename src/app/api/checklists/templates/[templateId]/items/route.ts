import { NextResponse } from "next/server";
import { db } from "@/db";
import { checklistTemplates, checklistTemplateItems } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, and } from "drizzle-orm";

export const POST = requireAuth(async (request: Request, _session, context) => {
  const { templateId } = await context!.params;
  const body = await request.json().catch(() => ({}));
  const { title, description, order } = body;

  if (!title || typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const template = await db
    .select()
    .from(checklistTemplates)
    .where(eq(checklistTemplates.id, templateId))
    .get();
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const item = await db
    .insert(checklistTemplateItems)
    .values({
      id: crypto.randomUUID(),
      templateId,
      title: title.trim(),
      description,
      order: order ?? 0,
    })
    .returning()
    .get();

  return NextResponse.json({ item }, { status: 201 });
}, "org:manage");

export const PATCH = requireAuth(async (request: Request, _session, context) => {
  const { templateId } = await context!.params;
  const body = await request.json().catch(() => ({}));
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
    .where(
      and(
        eq(checklistTemplateItems.id, id),
        eq(checklistTemplateItems.templateId, templateId)
      )
    )
    .returning()
    .get();

  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ item });
}, "org:manage");

export const DELETE = requireAuth(async (request: Request, _session, context) => {
  const { templateId } = await context!.params;
  const body = await request.json().catch(() => ({}));
  const { id } = body;

  if (!id) {
    return NextResponse.json({ error: "Item id is required" }, { status: 400 });
  }

  const item = await db
    .delete(checklistTemplateItems)
    .where(
      and(
        eq(checklistTemplateItems.id, id),
        eq(checklistTemplateItems.templateId, templateId)
      )
    )
    .returning()
    .get();

  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}, "org:manage");
