import { NextResponse } from "next/server";
import { db } from "@/db";
import { vehicles, vehicleBookings, mealNotifications, visitors } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, sql } from "drizzle-orm";

export const GET = requireAuth(async () => {
  const today = new Date().toISOString().split("T")[0];

  // 1. Vehicle Fleet Overview
  const vehicleList = await db.select().from(vehicles).all();
  const activeVehicles = vehicleList.filter((v) => v.isActive).length;
  const todayBookings = await db
    .select()
    .from(vehicleBookings)
    .where(eq(vehicleBookings.date, today))
    .all();

  // 2. Canteen Meal Overview
  const todayMeals = await db
    .select()
    .from(mealNotifications)
    .where(eq(mealNotifications.date, today))
    .all();

  const canteenSummary = {
    breakfast: {
      skip: todayMeals.filter((m) => m.mealType === "breakfast" && m.status === "skip").length,
      guestCount: todayMeals.filter((m) => m.mealType === "breakfast" && m.status === "bring_guest").reduce((s, m) => s + (m.guestCount || 0), 0),
    },
    lunch: {
      skip: todayMeals.filter((m) => m.mealType === "lunch" && m.status === "skip").length,
      guestCount: todayMeals.filter((m) => m.mealType === "lunch" && m.status === "bring_guest").reduce((s, m) => s + (m.guestCount || 0), 0),
    },
    dinner: {
      skip: todayMeals.filter((m) => m.mealType === "dinner" && m.status === "skip").length,
      guestCount: todayMeals.filter((m) => m.mealType === "dinner" && m.status === "bring_guest").reduce((s, m) => s + (m.guestCount || 0), 0),
    },
  };

  // 3. Visitor Campus Overview
  const checkedInVisitors = await db
    .select({ count: sql<number>`count(*)` })
    .from(visitors)
    .where(eq(visitors.status, "checked_in"))
    .get();

  const totalVisitorsToday = await db
    .select({ count: sql<number>`count(*)` })
    .from(visitors)
    .where(sql`date(${visitors.checkIn}) = ${today}`)
    .get();

  return NextResponse.json({
    date: today,
    fleet: {
      totalVehicles: vehicleList.length,
      activeVehicles,
      todayBookingsCount: todayBookings.length,
    },
    canteen: canteenSummary,
    visitors: {
      currentlyOnCampus: checkedInVisitors?.count || 0,
      totalToday: totalVisitorsToday?.count || 0,
    },
  });
}, "reports:read");
