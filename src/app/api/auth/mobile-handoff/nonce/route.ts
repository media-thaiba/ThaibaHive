import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { createMobileNonce } from "@/lib/auth/mobile-nonce-service";

export const POST = requireAuth(async (request: Request, session) => {
  try {
    let body: { targetUrl?: string; deviceId?: string } = {};
    try {
      body = await request.json();
    } catch {
      // Empty body allowed
    }

    const { nonce, expiresAt, redirectUrl } = await createMobileNonce({
      staffId: session.staffId,
      email: session.email,
      role: session.role,
      employeeId: session.employeeId,
      name: session.name,
      tokenVersion: session.tokenVersion,
      targetUrl: body.targetUrl || "/",
      deviceId: body.deviceId,
    });

    return NextResponse.json({
      success: true,
      nonce,
      expiresAt,
      redirectUrl,
    }, { status: 201 });
  } catch (error) {
    console.error("Mobile handoff nonce creation error:", error);
    return NextResponse.json(
      { error: "Failed to issue mobile authentication nonce" },
      { status: 500 }
    );
  }
});
