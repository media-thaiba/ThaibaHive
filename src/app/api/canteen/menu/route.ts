import { NextResponse } from "next/server";
import { db } from "@/db";
import { canteenItems, canteenMenus } from "@/db/schema";
import { requireAuth, resolveInstitutionContext, resolveScopedInstitutions } from "@/lib/api/auth-guard";
import { canteenItemCreateSchema, canteenMenuPublishSchema } from "@/lib/validation/schemas";
import { and, eq, inArray, type SQL } from "drizzle-orm";

export const GET = requireAuth(async (request: Request, session) => {
  const url = new URL(request.url);
  const date = url.searchParams.get("date") || new Date().toISOString().split("T")[0];
  const allowedInstitutions = await resolveScopedInstitutions(session, url.searchParams.get("institutionId"));
  const isGlobal = allowedInstitutions.includes("global");

  const institutionCondition: SQL | undefined = isGlobal
    ? undefined
    : allowedInstitutions.length === 1
      ? eq(canteenItems.institutionId, allowedInstitutions[0])
      : inArray(canteenItems.institutionId, allowedInstitutions);
  const menuInstitutionCondition: SQL | undefined = isGlobal
    ? undefined
    : allowedInstitutions.length === 1
      ? eq(canteenMenus.institutionId, allowedInstitutions[0])
      : inArray(canteenMenus.institutionId, allowedInstitutions);

  const items = await db
    .select()
    .from(canteenItems)
    .where(institutionCondition)
    .all();

  const menuConditions = [eq(canteenMenus.date, date)];
  if (menuInstitutionCondition) menuConditions.push(menuInstitutionCondition);
  const menus = await db
    .select()
    .from(canteenMenus)
    .where(and(...menuConditions))
    .all();

  return NextResponse.json({ date, items, menus });
}, "canteen:read");

export const POST = requireAuth(async (request: Request, session) => {
  const body = await request.json();
  const institutionId = await resolveInstitutionContext(session, body.institutionId);
  if (!institutionId) {
    return NextResponse.json(
      { error: "A concrete institution context is required to publish canteen data" },
      { status: 400 }
    );
  }

  if (body.type === "item") {
    const parsed = canteenItemCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid canteen item parameters", details: parsed.error.format() }, { status: 400 });
    }
    const { name, category, price, isAvailable, dietaryFlags, imageUrl } = parsed.data;

    const item = await db
      .insert(canteenItems)
      .values({
        id: crypto.randomUUID(),
        institutionId,
        name,
        category,
        price,
        isAvailable,
        dietaryFlags: dietaryFlags || null,
        imageUrl: imageUrl || null,
      })
      .returning()
      .get();

    return NextResponse.json({ item }, { status: 201 });
  } else {
    const parsed = canteenMenuPublishSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid canteen menu parameters", details: parsed.error.format() }, { status: 400 });
    }
    const { date, mealType, itemsJson } = parsed.data;

    const existing = await db
      .select({ id: canteenMenus.id })
      .from(canteenMenus)
      .where(
        and(
          eq(canteenMenus.institutionId, institutionId),
          eq(canteenMenus.date, date),
          eq(canteenMenus.mealType, mealType)
        )
      )
      .get();

    if (existing) {
      const menu = await db
        .update(canteenMenus)
        .set({ itemsJson, isActive: true })
        .where(eq(canteenMenus.id, existing.id))
        .returning()
        .get();
      return NextResponse.json({ menu, updated: true }, { status: 200 });
    }

    const menu = await db
      .insert(canteenMenus)
      .values({
        id: crypto.randomUUID(),
        institutionId,
        date,
        mealType,
        itemsJson,
        isActive: true,
      })
      .returning()
      .get();

    return NextResponse.json({ menu }, { status: 201 });
  }
}, "canteen:manage");
