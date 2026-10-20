import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { db, credentialChallenges, webauthnCredentials } from "@/db";
import { eq, and, sql } from "drizzle-orm";

export const POST = requireAuth(async (request, session) => {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { id, rawId, response, type } = body as {
    id?: string;
    rawId?: string;
    type?: string;
    response?: {
      clientDataJSON?: string;
      publicKey?: string;
      transports?: string[];
    };
  };

  if (!id || !rawId || !response || !type || !response.publicKey || !response.clientDataJSON) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const [challengeRecord] = await db
    .select()
    .from(credentialChallenges)
    .where(
      and(
        eq(credentialChallenges.staffId, session.staffId),
        eq(credentialChallenges.type, "registration"),
      )
    )
    .orderBy(sql`created_at desc`)
    .limit(1);

  if (!challengeRecord) {
    return NextResponse.json({ error: "No registration challenge found" }, { status: 400 });
  }

  if (new Date(challengeRecord.expiresAt) < new Date()) {
    await db.delete(credentialChallenges).where(eq(credentialChallenges.id, challengeRecord.id));
    return NextResponse.json({ error: "Challenge expired" }, { status: 400 });
  }

  try {
    const clientDataBuf = Buffer.from(response.clientDataJSON, "base64url");
    const clientData = JSON.parse(clientDataBuf.toString("utf8"));
    if (clientData.type !== "webauthn.create") {
      return NextResponse.json({ error: "Invalid WebAuthn clientData type" }, { status: 400 });
    }
    const expectedChallengeB64Url = Buffer.from(challengeRecord.challenge, "base64").toString("base64url");
    if (
      clientData.challenge !== challengeRecord.challenge &&
      clientData.challenge !== expectedChallengeB64Url
    ) {
      return NextResponse.json({ error: "Registration challenge mismatch" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid clientDataJSON payload" }, { status: 400 });
  }

  const credentialId = rawId || id;

  await db.insert(webauthnCredentials).values({
    id: crypto.randomUUID(),
    staffId: session.staffId,
    credentialId,
    publicKey: response.publicKey,
    algorithm: -7,
    transports: response.transports ? JSON.stringify(response.transports) : "",
    counter: 0,
    backupEligible: false,
    backupState: false,
  });

  await db
    .delete(credentialChallenges)
    .where(eq(credentialChallenges.id, challengeRecord.id));

  return NextResponse.json({ verified: true, credentialId });
}, "webauthn:manage");
