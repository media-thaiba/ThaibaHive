import { NextResponse } from "next/server";
import { db } from "@/db";
import { mealNotifications, staff } from "@/db/schema";
import { requireAuth, resolveScopedInstitutions } from "@/lib/api/auth-guard";
import { resolveScopedInstitutionId } from "@/lib/auth";
import { canteenCreateSchema } from "@/lib/validation/schemas";
import { eq, and, inArray } from "drizzle-orm";

export const GET = requireAuth(async (request: Request, session) => {
  const url = new URL(request.url);
  const requestedInst = url.searchParams.get("institutionId");
  const allowedInstitutions = await resolveScopedInstitutions(session, requestedInst);
  const date = url.searchParams.get("date") || new Date().toISOString().split("T")[0];

  const conditions = [eq(mealNotifications.date, date)];

  if (!allowedInstitutions.includes("global")) {
    if (allowedInstitutions.length === 1) {
      conditions.push(eq(mealNotifications.institutionId, allowedInstitutions[0]));
    } else if (allowedInstitutions.length > 1) {
      conditions.push(inArray(mealNotifications.institutionId, allowedInstitutions));
    }
  }

  const notifications = await db
    .select({
      id: mealNotifications.id, staffId: mealNotifications.staffId,
      date: mealNotifications.date, mealType: mealNotifications.mealType,
      status: mealNotifications.status, guestCount: mealNotifications.guestCount,
      notes: mealNotifications.notes,
      staffName: staff.firstName, staffLastName: staff.lastName })
    .from(mealNotifications)
    .leftJoin(staff, eq(mealNotifications.staffId, staff.id))
    .where(and(...conditions))
    .orderBy(mealNotifications.mealType)
    .all();

  const summary = {
    breakfast: { skip: notifications.filter(n => n.mealType === "breakfast" && n.status === "skip").length, guests: notifications.filter(n => n.mealType === "breakfast" && n.status === "bring_guest").reduce((s, n) => s + (n.guestCount || 0), 0) },
    lunch: { skip: notifications.filter(n => n.mealType === "lunch" && n.status === "skip").length, guests: notifications.filter(n => n.mealType === "lunch" && n.status === "bring_guest").reduce((s, n) => s + (n.guestCount || 0), 0) },
    dinner: { skip: notifications.filter(n => n.mealType === "dinner" && n.status === "skip").length, guests: notifications.filter(n => n.mealType === "dinner" && n.status === "bring_guest").reduce((s, n) => s + (n.guestCount || 0), 0) } };

  return NextResponse.json({ notifications, summary });
}, "canteen:read");

export const POST = requireAuth(async (request: Request, session) => {
  const body = await request.json();
  const parsed = canteenCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid canteen parameters", details: parsed.error.format() }, { status: 400 });
  }

  const { date, mealType, status, guestCount, notes } = parsed.data;
  const scopedInstitutionId = await resolveScopedInstitutionId(session.institutionId);

  const existing = await db
    .select()
    .from(mealNotifications)
    .where(and(eq(mealNotifications.staffId, session.staffId), eq(mealNotifications.date, date), eq(mealNotifications.mealType, mealType)))
    .get();

  if (existing) {
    await db.update(mealNotifications).set({ status, guestCount: guestCount || 0, notes }).where(eq(mealNotifications.id, existing.id)).run();
  } else {
    await db.insert(mealNotifications).values({
      id: crypto.randomUUID(),
      staffId: session.staffId,
      date,
      mealType,
      status,
      guestCount: guestCount || 0,
      notes,
      institutionId: scopedInstitutionId !== "global" ? scopedInstitutionId : null }).run();
  }

  return NextResponse.json({ success: true });
}, "canteen:create");