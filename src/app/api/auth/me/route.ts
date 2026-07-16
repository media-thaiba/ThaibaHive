import { NextResponse } from "next/server";
import { db } from "@/db";
import { staff } from "@/db/schema";
import { verifySession } from "@/lib/auth";
import { verifyPassword, hashPassword } from "@/lib/auth";
import { passwordChangeSchema, profileUpdateSchema } from "@/lib/auth/schemas";
import { eq, sql } from "drizzle-orm";

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
      isFirstLogin: staffMember.isFirstLogin,
    },
  });
}

export async function PATCH(request: Request) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();

  // Password change
  if (body.currentPassword || body.newPassword) {
    const parsed = passwordChangeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const row = await db.select({ passwordHash: staff.passwordHash }).from(staff).where(eq(staff.id, session.staffId)).get();
    if (!row) return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    if (!row.passwordHash) return NextResponse.json({ error: "Password not set" }, { status: 400 });

    const valid = await verifyPassword(parsed.data.currentPassword, row.passwordHash);
    if (!valid) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });

    const hashed = await hashPassword(parsed.data.newPassword);
    await db.update(staff).set({
      passwordHash: hashed,
      tokenVersion: sql`${staff.tokenVersion} + 1`,
    }).where(eq(staff.id, session.staffId)).run();
    return NextResponse.json({ success: true });
  }

  // Profile update
  const parsed = profileUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const updateData: Record<string, string> = {};
  if (parsed.data.firstName) updateData.firstName = parsed.data.firstName;
  if (parsed.data.lastName) updateData.lastName = parsed.data.lastName;
  if (parsed.data.phone !== undefined) updateData.phone = parsed.data.phone;
  if (parsed.data.designation !== undefined) updateData.designation = parsed.data.designation;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  await db.update(staff).set(updateData).where(eq(staff.id, session.staffId)).run();
  return NextResponse.json({ success: true });
}
