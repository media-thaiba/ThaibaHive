import { NextResponse } from "next/server";
import { db } from "@/db";
import { mealNotifications, staff, staffInstitutions } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, and, inArray } from "drizzle-orm";

export const GET = requireAuth(async (request: Request, session) => {
  const url = new URL(request.url);
  const date = url.searchParams.get("date") || new Date().toISOString().split("T")[0];

  const conditions = [eq(mealNotifications.date, date)];

  if (session.role !== "super_admin" && session.role !== "admin") {
    const userInst = await db
      .select({ institutionId: staffInstitutions.institutionId })
      .from(staffInstitutions)
      .where(eq(staffInstitutions.staffId, session.staffId))
      .all();
    const userInstIds = userInst.map((i) => i.institutionId);
    if (userInstIds.length > 0) {
      const instStaff = await db
        .select({ sid: staffInstitutions.staffId })
        .from(staffInstitutions)
        .where(inArray(staffInstitutions.institutionId, userInstIds))
        .all();
      conditions.push(inArray(mealNotifications.staffId, [...new Set(instStaff.map((s) => s.sid))]));
    }
  }

  const notifications = await db
    .select({
      id: mealNotifications.id, staffId: mealNotifications.staffId,
      date: mealNotifications.date, mealType: mealNotifications.mealType,
      status: mealNotifications.status, guestCount: mealNotifications.guestCount,
      notes: mealNotifications.notes,
      staffName: staff.firstName, staffLastName: staff.lastName,
    })
    .from(mealNotifications)
    .leftJoin(staff, eq(mealNotifications.staffId, staff.id))
    .where(and(...conditions))
    .orderBy(mealNotifications.mealType)
    .all();

  const summary = {
    breakfast: { skip: notifications.filter(n => n.mealType === "breakfast" && n.status === "skip").length, guests: notifications.filter(n => n.mealType === "breakfast" && n.status === "bring_guest").reduce((s, n) => s + (n.guestCount || 0), 0) },
    lunch: { skip: notifications.filter(n => n.mealType === "lunch" && n.status === "skip").length, guests: notifications.filter(n => n.mealType === "lunch" && n.status === "bring_guest").reduce((s, n) => s + (n.guestCount || 0), 0) },
    dinner: { skip: notifications.filter(n => n.mealType === "dinner" && n.status === "skip").length, guests: notifications.filter(n => n.mealType === "dinner" && n.status === "bring_guest").reduce((s, n) => s + (n.guestCount || 0), 0) },
  };

  return NextResponse.json({ notifications, summary });
}, "canteen:read");

export const POST = requireAuth(async (request: Request, session) => {
  const body = await request.json();
  const { date, mealType, status, guestCount, notes } = body;

  if (!date || !mealType || !status) {
    return NextResponse.json({ error: "Date, meal type, status required" }, { status: 400 });
  }

  const existing = await db
    .select()
    .from(mealNotifications)
    .where(and(eq(mealNotifications.staffId, session.staffId), eq(mealNotifications.date, date), eq(mealNotifications.mealType, mealType)))
    .get();

  if (existing) {
    await db.update(mealNotifications).set({ status, guestCount, notes }).where(eq(mealNotifications.id, existing.id)).run();
  } else {
    await db.insert(mealNotifications).values({
      id: crypto.randomUUID(), staffId: session.staffId, date, mealType, status, guestCount, notes,
    }).run();
  }

  return NextResponse.json({ success: true });
}, "canteen:create");