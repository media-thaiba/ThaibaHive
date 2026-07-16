import { NextResponse } from "next/server";
import { db } from "@/db";
import { bookings } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq } from "drizzle-orm";
import type { StaffRole } from "@/types";

const ADMIN_ROLES: StaffRole[] = ["super_admin", "admin", "principal"];

export const DELETE = requireAuth(async (_request, session, context) => {
  const { id } = await context!.params;
  
  const booking = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, id))
    .get();

  if (!booking) {
    return NextResponse.json({ error: "Booking request not found" }, { status: 404 });
  }

  const isAdmin = ADMIN_ROLES.includes(session.role as StaffRole);
  if (!isAdmin && booking.bookerId !== session.staffId) {
    return NextResponse.json({ error: "Unauthorized to cancel this booking" }, { status: 403 });
  }

  await db.delete(bookings).where(eq(bookings.id, id)).run();
  return NextResponse.json({ success: true });
}, "bookings:create");
