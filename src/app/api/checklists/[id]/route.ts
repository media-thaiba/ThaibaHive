import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  checklistTemplates,
  checklistTemplateItems,
} from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { pick } from "@/lib/api/pick";
import { eq, asc } from "drizzle-orm";
import { checklistUpdateSchema } from "@/lib/validation/schemas";

async function findScopedChecklistTemplate(id: string) {
  const template = await db
    .select()
    .from(checklistTemplates)
    .where(eq(checklistTemplates.id, id))
    .get();
  return template || null;
}

export const GET = requireAuth(async (_request, session, context) => {
  const rl = checkRateLimit(session.staffId, "read");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { id } = await context!.params;
  const template = await findScopedChecklistTemplate(id);

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
}, "checklists:read");

export const PATCH = requireAuth(async (request: Request, session, context) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { id } = await context!.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = checklistUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request data" }, { status: 400 });
  }

  const existing = await findScopedChecklistTemplate(id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await db
    .update(checklistTemplates)
    .set({
      ...pick(parsed.data, ["name", "type", "description", "isActive"]),
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

export const DELETE = requireAuth(async (_request, session, context) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { id } = await context!.params;

  const template = await findScopedChecklistTemplate(id);

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
