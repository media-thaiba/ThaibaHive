import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { checklistTemplates, checklistTemplateItems } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import {
  checklistTemplateItemCreateSchema,
  checklistTemplateItemUpdateSchema,
  checklistTemplateItemDeleteSchema,
} from "@/lib/validation/schemas";
import { eq, and } from "drizzle-orm";

export const POST = requireAuth(async (request: Request, session, context) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { templateId } = await context!.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = checklistTemplateItemCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request data" },
      { status: 400 }
    );
  }

  const { title, description, order } = parsed.data;

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
      id: randomUUID(),
      templateId,
      title: title.trim(),
      description: description ?? null,
      order: order ?? 0,
    })
    .returning()
    .get();

  return NextResponse.json({ item }, { status: 201 });
}, "org:manage");

export const PATCH = requireAuth(async (request: Request, session, context) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { templateId } = await context!.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = checklistTemplateItemUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request data" },
      { status: 400 }
    );
  }

  const { id, title, description, order } = parsed.data;

  const updates: Record<string, unknown> = {};
  if (title !== undefined) updates.title = title.trim();
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

export const DELETE = requireAuth(async (request: Request, session, context) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { templateId } = await context!.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = checklistTemplateItemDeleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request data" },
      { status: 400 }
    );
  }

  const { id } = parsed.data;

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
