import { NextResponse } from "next/server";
import { db } from "@/db";
import { staff } from "@/db/schema";
import { verifySession } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await verifySession();

  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const staffMember = await db
    .select()
    .from(staff)
    .where(eq(staff.id, session.staffId))
    .get();

  if (!staffMember) {
    return NextResponse.json({ error: "Staff not found" }, { status: 404 });
  }

  return NextResponse.json({
    staff: {
      id: staffMember.id,
      email: staffMember.email,
      firstName: staffMember.firstName,
      lastName: staffMember.lastName,
      role: staffMember.role,
      employeeId: staffMember.employeeId,
      phone: staffMember.phone,
      designation: staffMember.designation,
      avatarUrl: staffMember.avatarUrl,
      isActive: staffMember.isActive,
    },
  });
}
