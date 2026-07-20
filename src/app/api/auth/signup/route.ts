import { NextResponse } from "next/server";
import { db } from "@/db";
import { staff } from "@/db/schema";
import { hashPassword, createSession } from "@/lib/auth";
import { signupSchema } from "@/lib/auth/schemas";
import { checkRateLimit, extractIp, rateLimitResponse } from "@/lib/api/rate-limit";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const ip = extractIp(request);
    const rl = checkRateLimit(ip, "auth-signup");
    if (!rl.allowed) return rateLimitResponse(rl.resetMs);
    const body = await request.json();
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }
    const { email, password, employeeId, firstName, lastName } = parsed.data;

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

    const token = await createSession({
      staffId: newStaff.id,
      email: newStaff.email,
      role: newStaff.role,
      employeeId: newStaff.employeeId,
      name: `${newStaff.firstName} ${newStaff.lastName}`,
      tokenVersion: newStaff.tokenVersion,
    });

    return NextResponse.json(
      {
        token,
        user: {
          id: newStaff.id,
          email: newStaff.email,
          firstName: newStaff.firstName,
          lastName: newStaff.lastName,
          role: newStaff.role,
          employeeId: newStaff.employeeId,
        },
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
