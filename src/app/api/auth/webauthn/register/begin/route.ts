import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { db, credentialChallenges } from "@/db";

export const POST = requireAuth(async (request, session) => {
  const challenge = crypto.randomUUID();
  const hostname = new URL(request.url).hostname;

  const options = {
    challenge: Buffer.from(challenge).toString("base64url"),
    rp: { name: "ThaibaHive", id: hostname },
    user: {
      id: Buffer.from(session.staffId).toString("base64url"),
      name: session.email,
      displayName: session.name || session.email,
    },
    pubKeyCredParams: [{ alg: -7, type: "public-key" }],
    authenticatorSelection: { userVerification: "preferred" },
    timeout: 60000,
  };

  const expiresAt = new Date(Date.now() + 120 * 1000).toISOString();

  await db.insert(credentialChallenges).values({
    id: crypto.randomUUID(),
    staffId: session.staffId,
    challenge,
    type: "registration",
    expiresAt,
  });

  return NextResponse.json(options);
});
