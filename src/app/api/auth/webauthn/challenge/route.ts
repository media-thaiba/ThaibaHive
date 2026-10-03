import { NextResponse } from "next/server";
import { createChallenge } from "@/lib/identity/webauthn-service";
import { resolveStepUpIdentity } from "@/lib/identity/stepup-auth-helper";
import { checkDistributedRateLimit, extractIp, rateLimitResponse } from "@/lib/api/rate-limit";

export async function POST(request: Request) {
  const ip = extractIp(request);
  const rl = await checkDistributedRateLimit(ip, "auth");
  if (!rl.allowed) {
    return rateLimitResponse(rl.resetMs);
  }

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

  const challenge = createChallenge(identity.staffId);
  return NextResponse.json({
    challengeId: challenge.challengeId,
    challenge: challenge.challenge,
    expiresAt: challenge.expiresAt,
  });
}
