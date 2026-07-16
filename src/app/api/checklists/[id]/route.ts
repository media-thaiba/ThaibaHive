import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  checklistTemplates,
  checklistTemplateItems,
} from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { pick } from "@/lib/api/pick";
import { eq, asc } from "drizzle-orm";

export const GET = requireAuth(async (_request, _session, context) => {
  const { id } = await context!.params;
  const template = await db
    .select()
    .from(checklistTemplates)
    .where(eq(checklistTemplates.id, id))
    .get();

  if (!template) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const items = await db
    .select()
    .from(checklistTemplateItems)
    .where(eq(checklistTemplateItems.templateId, id))
    .orderBy(asc(checklistTemplateItems.order))
    .all();

  return NextResponse.json({ template, items });
});

export const PATCH = requireAuth(async (request: Request, _session, context) => {
  const { id } = await context!.params;
  const body = await request.json();

  const updated = await db
    .update(checklistTemplates)
    .set({
      ...pick(body, ["name", "type", "description"]),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(checklistTemplates.id, id))
    .returning()
    .get();

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ template: updated });
}, "org:manage");

export const DELETE = requireAuth(async (_request, _session, context) => {
  const { id } = await context!.params;

  const template = await db
    .select()
    .from(checklistTemplates)
    .where(eq(checklistTemplates.id, id))
    .get();

  if (!template) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db
    .delete(checklistTemplateItems)
    .where(eq(checklistTemplateItems.templateId, id))
    .run();
  await db
    .delete(checklistTemplates)
    .where(eq(checklistTemplates.id, id))
    .run();

  return NextResponse.json({ success: true });
}, "org:manage");
