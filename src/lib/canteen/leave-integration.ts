import { mealNotifications } from "@/db/schema";
import { and, eq, gte, lte } from "drizzle-orm";
import type { db as dbType } from "@/db";

type DbClient = typeof dbType | Parameters<Parameters<typeof dbType.transaction>[0]>[0];

interface AutoSkipParams {
  staffId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  institutionId?: string | null;
}

const MEAL_TYPES = ["breakfast", "lunch", "dinner"] as const;

export async function autoSkipMealsForLeave(
  tx: DbClient,
  params: AutoSkipParams
): Promise<number> {
  const { staffId, startDate, endDate, institutionId } = params;

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    return 0;
  }

  // Cap at 90 days to prevent memory/runaway anomalies
  const diffDays = Math.min(
    Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1,
    90
  );

  let affectedCount = 0;
  const curr = new Date(start);

  for (let d = 0; d < diffDays; d++) {
    const dateStr = curr.toISOString().split("T")[0];

    for (const mealType of MEAL_TYPES) {
      const existing = await tx
        .select()
        .from(mealNotifications)
        .where(
          and(
            eq(mealNotifications.staffId, staffId),
            eq(mealNotifications.date, dateStr),
            eq(mealNotifications.mealType, mealType)
          )
        )
        .get();

      if (existing) {
        // If it was already eating or unset, override to skip
        await tx
          .update(mealNotifications)
          .set({
            status: "skip",
            notes: "Auto-skipped: On Approved Leave",
          })
          .where(eq(mealNotifications.id, existing.id))
          .run();
      } else {
        await tx
          .insert(mealNotifications)
          .values({
            id: crypto.randomUUID(),
            staffId,
            date: dateStr,
            mealType,
            status: "skip",
            guestCount: 0,
            notes: "Auto-skipped: On Approved Leave",
            institutionId: institutionId || null,
          })
          .run();
      }
      affectedCount++;
    }

    curr.setDate(curr.getDate() + 1);
  }

  return affectedCount;
}

export async function revertAutoSkippedMealsForLeave(
  tx: DbClient,
  params: Omit<AutoSkipParams, "institutionId">
): Promise<void> {
  const { staffId, startDate, endDate } = params;

  await tx
    .delete(mealNotifications)
    .where(
      and(
        eq(mealNotifications.staffId, staffId),
        gte(mealNotifications.date, startDate),
        lte(mealNotifications.date, endDate),
        eq(mealNotifications.notes, "Auto-skipped: On Approved Leave")
      )
    )
    .run();
}
