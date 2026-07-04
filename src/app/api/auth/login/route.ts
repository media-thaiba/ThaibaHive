import { NextResponse } from "next/server";
import { db } from "@/db";
import { staff } from "@/db/schema";
import { verifyPassword, createSession } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      );
    }

    const staffMember = await db
      .select()
      .from(staff)
      .where(eq(staff.email, email))
      .get();

    if (!staffMember || !staffMember.passwordHash) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, staffMember.passwordHash);

    if (!valid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    if (!staffMember.isActive) {
      return NextResponse.json(
        { error: "Account is deactivated" },
        { status: 403 }
      );
    }

    await createSession({
      staffId: staffMember.id,
      email: staffMember.email,
      role: staffMember.role,
      employeeId: staffMember.employeeId,
      name: `${staffMember.firstName} ${staffMember.lastName}`,
    });

    return NextResponse.json({
      staff: {
        id: staffMember.id,
        email: staffMember.email,
        firstName: staffMember.firstName,
        lastName: staffMember.lastName,
        role: staffMember.role,
        employeeId: staffMember.employeeId,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
