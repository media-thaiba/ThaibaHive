import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { createMobileNonce } from "@/lib/auth/mobile-nonce-service";
import { checkDistributedRateLimit, extractIp } from "@/lib/api/rate-limit";

export const POST = requireAuth(async (request: Request, session) => {
  try {
    const ip = extractIp(request);
    const rl = await checkDistributedRateLimit(session.staffId || ip, "auth");
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    let body: { targetUrl?: string; deviceId?: string } = {};
    try {
      body = await request.json();
    } catch {
      // Empty body allowed
    }

    let targetUrl = "/";
    if (body.targetUrl && typeof body.targetUrl === "string") {
      const raw = body.targetUrl.trim();
      if (
        raw.startsWith("/") &&
        !raw.startsWith("//") &&
        !raw.includes("\\") &&
        !raw.includes("://") &&
        !raw.includes("\r") &&
        !raw.includes("\n")
      ) {
        targetUrl = raw;
      }
    }

    const { nonce, expiresAt, redirectUrl } = await createMobileNonce({
      staffId: session.staffId,
      email: session.email,
      role: session.role,
      employeeId: session.employeeId,
      name: session.name,
      tokenVersion: session.tokenVersion,
      targetUrl,
      deviceId: body.deviceId,
      institutionId: session.institutionId,
    });

    return NextResponse.json(
      {
        success: true,
        nonce,
        expiresAt,
        redirectUrl,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Mobile handoff nonce creation error:", error);
    return NextResponse.json(
      { error: "Failed to issue mobile authentication nonce" },
      { status: 500 }
    );
  }
}, "mobile:sync");
