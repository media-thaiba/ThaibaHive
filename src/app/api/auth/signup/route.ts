import { NextResponse } from "next/server";
import { db } from "@/db";
import { staff, staffInstitutions, institutions, emailVerificationTokens } from "@/db/schema";
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

    // Gate public signup: fail closed unless ALLOW_PUBLIC_SIGNUP="true" OR a valid INVITATION_SECRET is configured and matched (B-06)
    const allowPublicSignup = process.env.ALLOW_PUBLIC_SIGNUP === "true";
    const invitationToken = typeof (body?.invitationToken || body?.invitationCode) === "string"
      ? String(body.invitationToken || body.invitationCode)
      : "";
    const configuredSecret = process.env.INVITATION_SECRET || "";

    if (!allowPublicSignup) {
      if (!invitationToken || !configuredSecret) {
        return NextResponse.json(
          { error: "Public registration is disabled. Account creation requires an invitation token or administrator provisioning." },
          { status: 403 }
        );
      }
      const tokenBuf = Buffer.from(invitationToken);
      const secretBuf = Buffer.from(configuredSecret);
      if (tokenBuf.length !== secretBuf.length || !crypto.timingSafeEqual(tokenBuf, secretBuf)) {
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
    const autoVerifyPilot = process.env.AUTO_VERIFY_PILOT === "true";

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
        emailVerifiedAt: autoVerifyPilot ? new Date().toISOString() : null,
      })
      .returning()
      .get();

    // Assign new staff member to target or default institution so requireAuth does not block them with 403 after email verification (B-06)
    try {
      const requestedInstId = typeof body?.institutionId === "string" ? body.institutionId : null;
      let targetInstitution = requestedInstId
        ? await db.select({ id: institutions.id }).from(institutions).where(eq(institutions.id, requestedInstId)).get()
        : null;
      if (!targetInstitution) {
        targetInstitution = await db.select({ id: institutions.id }).from(institutions).limit(1).get();
      }
      if (targetInstitution?.id) {
        await db.insert(staffInstitutions).values({
          id: crypto.randomUUID(),
          staffId: newStaff.id,
          institutionId: targetInstitution.id,
        });
      }
    } catch {
      // Non-fatal if institutions table is empty in isolated unit tests
    }

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
