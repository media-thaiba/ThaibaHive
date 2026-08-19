import { NextResponse } from "next/server";
import { createChallenge } from "@/lib/identity/webauthn-service";
import { resolveStepUpIdentity } from "@/lib/identity/stepup-auth-helper";

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

  const challenge = createChallenge(identity.staffId);
  return NextResponse.json({
    challengeId: challenge.challengeId,
    challenge: challenge.challenge,
    expiresAt: challenge.expiresAt,
  });
}
