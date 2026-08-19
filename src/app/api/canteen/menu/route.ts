import { NextResponse } from "next/server";
import { db } from "@/db";
import { canteenItems, canteenMenus } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { canteenItemCreateSchema, canteenMenuPublishSchema } from "@/lib/validation/schemas";
import { eq,  } from "drizzle-orm";

export const GET = requireAuth(async (request: Request) => {
  const url = new URL(request.url);
  const date = url.searchParams.get("date") || new Date().toISOString().split("T")[0];

  const items = await db.select().from(canteenItems).all();
  const menus = await db.select().from(canteenMenus).where(eq(canteenMenus.date, date)).all();

  return NextResponse.json({ date, items, menus });
}, "canteen:read");

export const POST = requireAuth(async (request: Request) => {
  const body = await request.json();
  
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
        institutionId: "inst_001",
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

    const menu = await db
      .insert(canteenMenus)
      .values({
        id: crypto.randomUUID(),
        institutionId: "inst_001",
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
