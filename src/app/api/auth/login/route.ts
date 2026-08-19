import { NextResponse } from "next/server";
import { db } from "@/db";
import { staff } from "@/db/schema";
import { verifyPassword, createSession } from "@/lib/auth";
import { loginSchema } from "@/lib/auth/schemas";
import { logActivity } from "@/lib/api/activity-log";
import { checkRateLimit, extractIp, rateLimitResponse } from "@/lib/api/rate-limit";
import { serverLogger } from "@/lib/server-logger";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const ip = extractIp(request);
    const rl = checkRateLimit(ip, "auth");
    if (!rl.allowed) return rateLimitResponse(rl.resetMs);

    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }
    const { email, password, rememberMe } = parsed.data;

    const emailRl = checkRateLimit(`login-email:${email.toLowerCase()}`, "auth");
    if (!emailRl.allowed) return rateLimitResponse(emailRl.resetMs);

    const staffMember = await db
      .select()
      .from(staff)
      .where(eq(staff.email, email))
      .get();

    if (!staffMember || !staffMember.passwordHash) {
      serverLogger.warn("Login failed: user not found", { email });
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, staffMember.passwordHash);

    if (!valid) {
      serverLogger.warn("Login failed: password mismatch", { email });
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    if (!staffMember.isActive) {
      serverLogger.warn("Login failed: user inactive", { email });
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const token = await createSession({
      staffId: staffMember.id,
      email: staffMember.email,
      role: staffMember.role,
      employeeId: staffMember.employeeId,
      name: `${staffMember.firstName} ${staffMember.lastName}`,
      tokenVersion: staffMember.tokenVersion ?? 0,
    }, rememberMe);

    await logActivity({
      request,
      staffId: staffMember.id,
      action: "LOGIN",
      resourceType: "auth",
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
} catch (error: unknown) {
    serverLogger.error("Login error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
