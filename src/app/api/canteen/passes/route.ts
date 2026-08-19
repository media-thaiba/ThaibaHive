import { NextResponse } from "next/server";
import { db } from "@/db";
import { canteenMealPasses } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { canteenPassCreateSchema } from "@/lib/validation/schemas";
import { eq, desc } from "drizzle-orm";

export const GET = requireAuth(async (request: Request, session) => {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId") || session.staffId;

  const passes = await db
    .select()
    .from(canteenMealPasses)
    .where(eq(canteenMealPasses.userId, userId))
    .orderBy(desc(canteenMealPasses.createdAt))
    .all();

  return NextResponse.json({ passes });
}, "canteen:read");

export const POST = requireAuth(async (request: Request) => {
  const body = await request.json();
  const parsed = canteenPassCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid meal pass parameters", details: parsed.error.format() }, { status: 400 });
  }

  const { userId, passCode, balance, dailyLimit } = parsed.data;

  const pass = await db
    .insert(canteenMealPasses)
    .values({
      id: crypto.randomUUID(),
      institutionId: "inst_001",
      userId,
      passCode,
      balance,
      currency: "INR",
      status: "active",
      dailyLimit: dailyLimit || null,
    })
    .returning()
    .get();

  return NextResponse.json({ pass }, { status: 201 });
}, "canteen:manage");
