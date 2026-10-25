import { NextResponse } from "next/server";
import { db } from "@/db";
import { staffMealPreferences } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq } from "drizzle-orm";
import { z } from "zod";

const preferencesSchema = z.object({
  defaultBreakfast: z.enum(["eating", "skip"]).default("eating"),
  defaultLunch: z.enum(["eating", "skip"]).default("eating"),
  defaultDinner: z.enum(["eating", "skip"]).default("eating"),
  skipStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  skipEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  recurringSkipDays: z.array(z.number().int().min(0).max(6)).optional().default([]),
}).refine(
  (data) => {
    if (data.skipStartDate && data.skipEndDate) {
      return data.skipStartDate <= data.skipEndDate;
    }
    return true;
  },
  { message: "skipStartDate must be before or equal to skipEndDate", path: ["skipEndDate"] }
);

export const GET = requireAuth(async (_request, session) => {
  const row = await db
    .select()
    .from(staffMealPreferences)
    .where(eq(staffMealPreferences.staffId, session.staffId))
    .get();

  let recurringDays: number[] = [];
  if (row?.recurringSkipDays) {
    try {
      recurringDays = JSON.parse(row.recurringSkipDays);
    } catch {
      recurringDays = [];
    }
  }

  return NextResponse.json({
    preferences: {
      defaultBreakfast: row?.defaultBreakfast ?? "eating",
      defaultLunch: row?.defaultLunch ?? "eating",
      defaultDinner: row?.defaultDinner ?? "eating",
      skipStartDate: row?.skipStartDate ?? null,
      skipEndDate: row?.skipEndDate ?? null,
      recurringSkipDays: recurringDays,
    },
  });
}, "canteen:read");

export const PUT = requireAuth(async (request: Request, session) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = preferencesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const {
    defaultBreakfast,
    defaultLunch,
    defaultDinner,
    skipStartDate,
    skipEndDate,
    recurringSkipDays,
  } = parsed.data;

  const now = new Date().toISOString();
  const recurringStr = JSON.stringify(recurringSkipDays || []);

  const existing = await db
    .select()
    .from(staffMealPreferences)
    .where(eq(staffMealPreferences.staffId, session.staffId))
    .get();

  if (existing) {
    await db
      .update(staffMealPreferences)
      .set({
        defaultBreakfast,
        defaultLunch,
        defaultDinner,
        skipStartDate: skipStartDate || null,
        skipEndDate: skipEndDate || null,
        recurringSkipDays: recurringStr,
        updatedAt: now,
      })
      .where(eq(staffMealPreferences.id, existing.id))
      .run();
  } else {
    await db
      .insert(staffMealPreferences)
      .values({
        id: crypto.randomUUID(),
        staffId: session.staffId,
        defaultBreakfast,
        defaultLunch,
        defaultDinner,
        skipStartDate: skipStartDate || null,
        skipEndDate: skipEndDate || null,
        recurringSkipDays: recurringStr,
        updatedAt: now,
      })
      .run();
  }

  return NextResponse.json({
    preferences: {
      defaultBreakfast,
      defaultLunch,
      defaultDinner,
      skipStartDate: skipStartDate || null,
      skipEndDate: skipEndDate || null,
      recurringSkipDays: recurringSkipDays || [],
    },
  });
}, "canteen:create");
