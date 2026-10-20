import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { checklistTemplates, checklistTemplateItems } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { checklistTemplateCreateSchema } from "@/lib/validation/schemas";
import { eq, sql } from "drizzle-orm";

export const GET = requireAuth(async (_request, session) => {
  const rl = checkRateLimit(session.staffId, "read");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const templates = await db
    .select({
      id: checklistTemplates.id,
      name: checklistTemplates.name,
      type: checklistTemplates.type,
      description: checklistTemplates.description,
      isActive: checklistTemplates.isActive,
      createdAt: checklistTemplates.createdAt,
      updatedAt: checklistTemplates.updatedAt,
      itemsCount: sql<number>`count(${checklistTemplateItems.id})`,
    })
    .from(checklistTemplates)
    .leftJoin(
      checklistTemplateItems,
      eq(checklistTemplateItems.templateId, checklistTemplates.id)
    )
    .groupBy(checklistTemplates.id)
    .orderBy(checklistTemplates.createdAt);

  return NextResponse.json({ templates });
}, "checklists:read");

export const POST = requireAuth(async (request: Request, session) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = checklistTemplateCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request data" },
      { status: 400 }
    );
  }

  const { name, type, description, items } = parsed.data;
  const templateId = randomUUID();

  const template = await db
    .insert(checklistTemplates)
    .values({
      id: templateId,
      name,
      type,
      description: description ?? null,
    })
    .returning()
    .get();

  if (items && items.length > 0) {
    await db
      .insert(checklistTemplateItems)
      .values(
        items.map((item) => ({
          id: randomUUID(),
          templateId,
          title: item.title,
          description: item.description ?? null,
          order: item.order ?? 0,
        }))
      )
      .run();
  }

  return NextResponse.json({ template }, { status: 201 });
}, "org:manage");
