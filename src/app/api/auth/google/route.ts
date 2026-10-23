import { NextResponse } from "next/server";
import { db } from "@/db";
import { staff } from "@/db/schema";
import { createSession, verifyGoogleToken } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { checkDistributedRateLimit, extractIp, rateLimitResponse } from "@/lib/api/rate-limit";
import { randomBytes } from "crypto";

export async function POST(request: Request) {
  const ip = extractIp(request);
  const rateLimit = await checkDistributedRateLimit(`auth:google:${ip}`, "auth");
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.resetMs);
  }

  try {
    const body = await request.json();
    const { idToken } = body;

    if (!idToken) {
      return NextResponse.json({ error: "Google ID token is required" }, { status: 400 });
    }

    const rawIds = [process.env.GOOGLE_CLIENT_IDS, process.env.NEXT_PUBLIC_GOOGLE_CLIENT_IDS]
      .filter(Boolean)
      .join(",");
    const allowedClientIds = Array.from(
      new Set(rawIds.split(",").map(c => c.trim()).filter(Boolean))
    );

    if (allowedClientIds.length === 0) {
      console.error("Neither GOOGLE_CLIENT_IDS nor NEXT_PUBLIC_GOOGLE_CLIENT_IDS is configured — rejecting Google auth");
      return NextResponse.json({ error: "Google authentication is not configured" }, { status: 503 });
    }

    let payload;
    try {
      payload = await verifyGoogleToken(idToken, allowedClientIds);
    } catch (err: unknown) {
      console.error("Google token verification failed:", err);
      return NextResponse.json({ error: "Invalid Google token" }, { status: 401 });
    }

    const { email, name, picture, sub } = payload;

    const staffMember = await db
      .select()
      .from(staff)
      .where(eq(staff.email, email))
      .get();

    let isFirstLogin = false;
    let needsOnboarding = false;

    if (!staffMember) {
      // JIT provisioning: auto-create staff record from Google profile
      const googleName = name ?? email.split("@")[0];
      const nameParts = googleName.split(" ");
      const firstName = nameParts[0] ?? "";
      const lastName = nameParts.slice(1).join(" ") ?? "";

      // Generate unique employeeId: EMP-G-<6-char-alphanumeric>
      let employeeId: string;
      let attempts = 0;
      do {
        const random = randomBytes(3).toString("hex").toUpperCase().slice(0, 6);
        employeeId = `EMP-G-${random}`;
        const existing = await db
          .select()
          .from(staff)
          .where(eq(staff.employeeId, employeeId))
          .get();
        if (!existing) break;
        attempts++;
      } while (attempts < 10);

      if (attempts >= 10) {
        return NextResponse.json(
          { error: "Failed to generate unique employee ID. Please try again." },
          { status: 500 }
        );
      }

      const now = new Date().toISOString();
      const [newStaff] = await db
        .insert(staff)
        .values({
          id: `staff_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          email,
          employeeId,
          firstName,
          lastName,
          role: "staff",
          avatarUrl: picture ?? null,
          isActive: true, // Google-verified identity; role is low-privilege "staff" until onboarding
          isFirstLogin: true,
          emailVerifiedAt: now,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      isFirstLogin = true;
      needsOnboarding = true;

      // Use the newly created staff member for session creation
      const token = await createSession({
        staffId: newStaff.id,
        email: newStaff.email,
        role: newStaff.role,
        employeeId: newStaff.employeeId,
        name: `${newStaff.firstName} ${newStaff.lastName}`,
        tokenVersion: newStaff.tokenVersion ?? 0,
      });

      // F-12: token-in-body only for mobile clients presenting the platform header.
      const isMobileClient = (request.headers.get("x-client-platform") ?? "").toLowerCase() === "mobile";

      return NextResponse.json({
        ...(isMobileClient ? { token } : {}),
        needsOnboarding: true,
        isFirstLogin: true,
        user: {
          id: newStaff.id,
          email: newStaff.email,
          firstName: newStaff.firstName,
          lastName: newStaff.lastName,
          role: newStaff.role,
          employeeId: newStaff.employeeId,
        },
      });
    }

    if (!staffMember.isActive) {
      return NextResponse.json(
        { error: "Account is deactivated" },
        { status: 403 }
      );
    }

    // Federated IdP already proved email ownership — auto-verify on first SSO login
    if (!staffMember.emailVerifiedAt) {
      await db
        .update(staff)
        .set({ emailVerifiedAt: new Date().toISOString() })
        .where(eq(staff.id, staffMember.id));
    }

    isFirstLogin = staffMember.isFirstLogin ?? false;
    needsOnboarding = isFirstLogin;

    const token = await createSession({
      staffId: staffMember.id,
      email: staffMember.email,
      role: staffMember.role,
      employeeId: staffMember.employeeId,
      name: `${staffMember.firstName} ${staffMember.lastName}`,
      tokenVersion: staffMember.tokenVersion ?? 0,
    });

    // F-12: token-in-body only for mobile clients presenting the platform header.
    const isMobileClient = (request.headers.get("x-client-platform") ?? "").toLowerCase() === "mobile";

    return NextResponse.json({
      ...(isMobileClient ? { token } : {}),
      needsOnboarding,
      isFirstLogin,
      user: {
        id: staffMember.id,
        email: staffMember.email,
        firstName: staffMember.firstName,
        lastName: staffMember.lastName,
        role: staffMember.role,
        employeeId: staffMember.employeeId,
      },
    });
  } catch (error) {
    console.error("Google auth error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
