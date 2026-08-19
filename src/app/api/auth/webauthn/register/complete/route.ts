import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { db, credentialChallenges, webauthnCredentials } from "@/db";
import { eq, and, sql } from "drizzle-orm";

export const POST = requireAuth(async (request, session) => {
  const { id, rawId, response, type } = await request.json();

  if (!id || !rawId || !response || !type) {
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
    return NextResponse.json({ error: "Challenge expired" }, { status: 400 });
  }

  const credentialId = rawId || id;

  await db.insert(webauthnCredentials).values({
    id: crypto.randomUUID(),
    staffId: session.staffId,
    credentialId,
    publicKey: response.publicKey || "",
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
});
