import { NextResponse } from "next/server";
import { db } from "@/db";
import { bookings, bookingResources } from "@/db/schema";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { resolveScopedInstitutionId } from "@/lib/auth";
import { eq } from "drizzle-orm";
import type { StaffRole } from "@/types";

const ADMIN_ROLES: StaffRole[] = ["super_admin", "admin", "principal"];

export const DELETE = requireAuth(async (_request, session, context) => {
  const { id } = await context!.params;
  const institutionId = await resolveScopedInstitutionId(session.institutionId);
  
  const booking = await db
    .select({
      id: bookings.id,
      bookerId: bookings.bookerId,
      resourceInstitutionId: bookingResources.institutionId,
      bookingInstitutionId: bookings.institutionId,
    })
    .from(bookings)
    .leftJoin(bookingResources, eq(bookings.resourceId, bookingResources.id))
    .where(eq(bookings.id, id))
    .get();

  if (!booking) {
    return NextResponse.json({ error: "Booking request not found" }, { status: 404 });
  }

  const effectiveInst = booking.bookingInstitutionId || booking.resourceInstitutionId;
  if (institutionId && institutionId !== "global" && effectiveInst && effectiveInst !== institutionId) {
    return NextResponse.json({ error: "Booking request not found" }, { status: 404 });
  }

  const isAdmin = ADMIN_ROLES.includes(session.role as StaffRole);
  if (!isAdmin && booking.bookerId !== session.staffId) {
    return NextResponse.json({ error: "Unauthorized to cancel this booking" }, { status: 403 });
  }

  await db.delete(bookings).where(eq(bookings.id, id)).run();
  return NextResponse.json({ success: true });
}, "bookings:create");
