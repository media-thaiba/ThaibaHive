import { NextResponse } from "next/server";
import { db } from "@/db";
import { staff } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq } from "drizzle-orm";

export const GET = requireAuth(async () => {
  const all = await db
    .select({
      id: staff.id,
      firstName: staff.firstName,
      lastName: staff.lastName,
      employeeId: staff.employeeId,
      designation: staff.designation,
    })
    .from(staff)
    .where(eq(staff.isActive, true))
    .orderBy(staff.firstName)
    .all();

  return NextResponse.json({ staff: all });
}, "attendance:manage");
