import { NextResponse } from "next/server";
import { db } from "@/db";
import { staff } from "@/db/schema";
import { createSession, verifyGoogleToken } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { checkDistributedRateLimit, extractIp, rateLimitResponse } from "@/lib/api/rate-limit";

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

    const allowedClientIds = process.env.GOOGLE_CLIENT_IDS
      ? process.env.GOOGLE_CLIENT_IDS.split(",").map(c => c.trim())
      : [];

    if (allowedClientIds.length === 0) {
      console.error("GOOGLE_CLIENT_IDS is not configured — rejecting Google auth");
      return NextResponse.json({ error: "Google authentication is not configured" }, { status: 503 });
    }

    let payload;
    try {
      payload = await verifyGoogleToken(idToken, allowedClientIds);
    } catch (err: unknown) {
      console.error("Google token verification failed:", err);
      return NextResponse.json({ error: "Invalid Google token" }, { status: 401 });
    }

    const { email } = payload;

    const staffMember = await db
      .select()
      .from(staff)
      .where(eq(staff.email, email))
      .get();

    if (!staffMember) {
      console.warn(`[Auth] Google login failed: User ${email} does not exist in the staff database.`);
      return NextResponse.json(
        { error: "Invalid Google token" },
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
      tokenVersion: staffMember.tokenVersion ?? 0,
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
    });
  } catch (error) {
    console.error("Google auth error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
