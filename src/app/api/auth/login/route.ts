import { NextResponse } from "next/server";
import { db } from "@/db";
import { staff } from "@/db/schema";
import { verifyPassword, createSession } from "@/lib/auth";
import { loginSchema } from "@/lib/auth/schemas";
import { eq } from "drizzle-orm";

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX = 5;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || request.headers.get("x-real-ip")
      || "unknown";

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }
    const { email, password } = parsed.data;

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

    const token = await createSession({
      staffId: staffMember.id,
      email: staffMember.email,
      role: staffMember.role,
      employeeId: staffMember.employeeId,
      name: `${staffMember.firstName} ${staffMember.lastName}`,
      tokenVersion: staffMember.tokenVersion,
    });

    return NextResponse.json({
      token,
      user: {
        id: staffMember.id,
        email: staffMember.email,
        firstName: staffMember.firstName,
        lastName: staffMember.lastName,
        role: staffMember.role,
        employeeId: staffMember.employeeId,
      },
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
