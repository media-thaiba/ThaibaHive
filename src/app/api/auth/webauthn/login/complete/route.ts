import crypto from "crypto";
import { NextResponse } from "next/server";
import { db, credentialChallenges, webauthnCredentials, staff } from "@/db";
import { eq, and, sql } from "drizzle-orm";
import { createSession, createSessionWithRefresh } from "@/lib/auth";
import { checkDistributedRateLimit, extractIp, rateLimitResponse } from "@/lib/api/rate-limit";

export async function POST(request: Request) {
  const ip = extractIp(request);
  const rl = await checkDistributedRateLimit(ip, "auth");
  if (!rl.allowed) {
    return rateLimitResponse(rl.resetMs);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { id, rawId, response } = body as {
    id?: string;
    rawId?: string;
    response?: {
      clientDataJSON?: string;
      authenticatorData?: string;
      signature?: string;
      userHandle?: string | null;
    };
  };

  if (
    !id ||
    !rawId ||
    !response ||
    typeof response.clientDataJSON !== "string" ||
    typeof response.authenticatorData !== "string" ||
    typeof response.signature !== "string"
  ) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const credentialId = rawId || id;

  const [credential] = await db
    .select()
    .from(webauthnCredentials)
    .where(eq(webauthnCredentials.credentialId, credentialId))
    .limit(1);

  if (!credential || !credential.publicKey) {
    return NextResponse.json({ error: "Credential not found" }, { status: 404 });
  }

  const [challengeRecord] = await db
    .select()
    .from(credentialChallenges)
    .where(
      and(
        eq(credentialChallenges.type, "authentication"),
        eq(credentialChallenges.staffId, credential.staffId),
      )
    )
    .orderBy(sql`created_at desc`)
    .limit(1);

  if (!challengeRecord) {
    return NextResponse.json({ error: "No authentication challenge found" }, { status: 400 });
  }

  if (new Date(challengeRecord.expiresAt) < new Date()) {
    await db.delete(credentialChallenges).where(eq(credentialChallenges.id, challengeRecord.id));
    return NextResponse.json({ error: "Challenge expired" }, { status: 400 });
  }

  // Always consume the challenge to prevent replay attacks
  await db
    .delete(credentialChallenges)
    .where(eq(credentialChallenges.id, challengeRecord.id));

  // Cryptographically verify clientDataJSON, authenticatorData, and signature (B-01)
  let newCounter = credential.counter + 1;
  try {
    const clientDataBuf = Buffer.from(response.clientDataJSON, "base64url");
    const clientData = JSON.parse(clientDataBuf.toString("utf8"));

    if (clientData.type !== "webauthn.get") {
      return NextResponse.json({ error: "Invalid WebAuthn clientData type" }, { status: 401 });
    }

    const expectedChallengeB64Url = Buffer.from(challengeRecord.challenge, "base64").toString("base64url");
    if (
      clientData.challenge !== challengeRecord.challenge &&
      clientData.challenge !== expectedChallengeB64Url
    ) {
      return NextResponse.json({ error: "WebAuthn challenge mismatch" }, { status: 401 });
    }

    const authDataBuf = Buffer.from(response.authenticatorData, "base64url");
    if (authDataBuf.length < 37) {
      return NextResponse.json({ error: "Invalid authenticatorData length" }, { status: 401 });
    }

    // Verify User Present (UP) bit flag (bit 0 of flags byte at offset 32)
    const flags = authDataBuf[32];
    if ((flags & 0x01) === 0) {
      return NextResponse.json({ error: "User presence flag not set on assertion" }, { status: 401 });
    }

    const signCount = authDataBuf.readUInt32BE(33);
    if (credential.counter > 0 && signCount <= credential.counter) {
      return NextResponse.json({ error: "Authenticator clone or replay detected (invalid signCount)" }, { status: 401 });
    }
    if (signCount > credential.counter) {
      newCounter = signCount;
    }

    const clientDataHash = crypto.createHash("sha256").update(clientDataBuf).digest();
    const signedData = Buffer.concat([authDataBuf, clientDataHash]);
    const sigBuf = Buffer.from(response.signature, "base64url");

    const verifier = crypto.createVerify("SHA256");
    verifier.update(signedData);
    const isSigValid = verifier.verify(credential.publicKey, sigBuf);
    if (!isSigValid) {
      return NextResponse.json({ error: "Invalid WebAuthn assertion signature" }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: "WebAuthn cryptographic verification failed" }, { status: 401 });
  }

  await db
    .update(webauthnCredentials)
    .set({
      counter: newCounter,
      lastUsedAt: new Date().toISOString(),
    })
    .where(eq(webauthnCredentials.id, credential.id));

  const [user] = await db
    .select()
    .from(staff)
    .where(eq(staff.id, credential.staffId))
    .limit(1);

  if (!user || !user.isActive) {
    return NextResponse.json({ error: "User account is inactive" }, { status: 403 });
  }

  const sessionPayload = {
    staffId: user.id,
    email: user.email,
    role: user.role,
    employeeId: user.employeeId,
    name: `${user.firstName} ${user.lastName}`,
    tokenVersion: user.tokenVersion ?? 0,
  };

  // F-12: token-in-body only for mobile clients presenting the platform header.
  const isMobileClient = (request.headers.get("x-client-platform") ?? "").toLowerCase() === "mobile";
  let token: string;
  let refreshToken: string | undefined;

  if (isMobileClient) {
    const res = await createSessionWithRefresh(
      sessionPayload,
      true,
      "mobile",
      30 * 24 * 60 * 60
    );
    token = res.token;
    refreshToken = res.refreshToken;
  } else {
    token = await createSession(sessionPayload);
  }

  return NextResponse.json({
    ...(isMobileClient ? { token, ...(refreshToken ? { refreshToken } : {}) } : {}),
    verified: true,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      employeeId: user.employeeId,
    },
  });
}
