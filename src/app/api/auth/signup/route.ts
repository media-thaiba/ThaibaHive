import { NextResponse } from "next/server";
import { db } from "@/db";
import { staff, emailVerificationTokens } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { signupSchema } from "@/lib/auth/schemas";
import { checkDistributedRateLimit, extractIp, rateLimitResponse } from "@/lib/api/rate-limit";
import { eq } from "drizzle-orm";
import { withPublicApm } from "@/lib/api/public-apm";
import { sendVerificationEmail } from "@/lib/email";
import { waitUntil } from "@vercel/functions";
import crypto from "crypto";

export const POST = withPublicApm(async function POST(request: Request) {
  try {
    const ip = extractIp(request);
    const rl = await checkDistributedRateLimit(ip, "auth-signup");
    if (!rl.allowed) return rateLimitResponse(rl.resetMs);
    const body = await request.json();
    
    // Gate public signup: require invitation token unless explicit dev override is set
    const allowPublicSignup = process.env.ALLOW_PUBLIC_SIGNUP === "true";
    const invitationToken = body?.invitationToken || body?.invitationCode;

    if (!allowPublicSignup && !invitationToken) {
      return NextResponse.json(
        { error: "Public registration is disabled. Account creation requires an invitation token or administrator provisioning." },
        { status: 403 }
      );
    }

    if (invitationToken && process.env.INVITATION_SECRET) {
      if (invitationToken !== process.env.INVITATION_SECRET) {
        return NextResponse.json(
          { error: "Invalid or expired invitation token." },
          { status: 403 }
        );
      }
    }

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
        emailVerifiedAt: null,
      })
      .returning()
      .get();

    const verifyToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(verifyToken).digest("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await db.insert(emailVerificationTokens).values({
      staffId: newStaff.id,
      tokenHash,
      expiresAt,
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const verifyUrl = `${appUrl}/auth/verify-email/${verifyToken}`;
    waitUntil(
      sendVerificationEmail(newStaff.email, newStaff.firstName, verifyUrl).catch(
        console.error
      )
    );

    return NextResponse.json(
      {
        message:
          "Account created. Check your email for a verification link to activate your account.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});
