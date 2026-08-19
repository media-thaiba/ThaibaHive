import { NextResponse } from "next/server";
import { generateOTPCode } from "@/lib/identity/webauthn-service";
import { resolveStepUpIdentity } from "@/lib/identity/stepup-auth-helper";
import { sendStepUpOTPEmail } from "@/lib/email";
import { serverLogger } from "@/lib/server-logger";
import { db } from "@/db";
import { staff } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  let body: any = {};
  try {
    body = await request.json();
  } catch {
    // Body optional if authenticated via cookie
  }

  const identity = await resolveStepUpIdentity(request, body);
  if (!identity) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const code = generateOTPCode(identity.staffId);

  // Deliver OTP to staff user email & notification dispatcher
  try {
    const user = await db
      .select({ email: staff.email, firstName: staff.firstName })
      .from(staff)
      .where(eq(staff.id, identity.staffId))
      .get();

    if (user?.email) {
      serverLogger.info("Step-up OTP challenge generated and dispatched", {
        userId: identity.staffId,
        recipient: user.email,
        channel: "email",
      });

      await sendStepUpOTPEmail(
        user.email,
        user.firstName || "Staff Member",
        code,
      );
    }
  } catch (err) {
    serverLogger.error("Failed to dispatch step-up OTP email", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return NextResponse.json({ sent: true });
}
