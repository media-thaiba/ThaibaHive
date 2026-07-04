import { NextResponse } from "next/server";
import { db } from "@/db";
import { staff } from "@/db/schema";
import { hashPassword, createSession } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, employeeId, firstName, lastName } = body;

    if (!email || !password || !employeeId || !firstName || !lastName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const existingStaff = await db
      .select()
      .from(staff)
      .where(eq(staff.email, email))
      .get();

    if (existingStaff) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const newStaff = await db
      .insert(staff)
      .values({
        id: crypto.randomUUID(),
        email,
        employeeId,
        firstName,
        lastName,
        passwordHash,
        role: "staff",
      })
      .returning()
      .get();

    await createSession({
      staffId: newStaff.id,
      email: newStaff.email,
      role: newStaff.role,
      employeeId: newStaff.employeeId,
      name: `${newStaff.firstName} ${newStaff.lastName}`,
    });

    return NextResponse.json(
      {
        staff: {
          id: newStaff.id,
          email: newStaff.email,
          firstName: newStaff.firstName,
          lastName: newStaff.lastName,
          role: newStaff.role,
          employeeId: newStaff.employeeId,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
