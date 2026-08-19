import { NextResponse } from "next/server";
import { db, credentialChallenges, webauthnCredentials, staff } from "@/db";
import { eq, and, sql } from "drizzle-orm";
import { createSession } from "@/lib/auth";

export async function POST(request: Request) {
  const { id, rawId, response } = await request.json();

  if (!id || !rawId || !response) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const credentialId = rawId || id;

  const [credential] = await db
    .select()
    .from(webauthnCredentials)
    .where(eq(webauthnCredentials.credentialId, credentialId))
    .limit(1);

  if (!credential) {
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
    return NextResponse.json({ error: "Challenge expired" }, { status: 400 });
  }

  await db
    .update(webauthnCredentials)
    .set({
      counter: credential.counter + 1,
      lastUsedAt: new Date().toISOString(),
    })
    .where(eq(webauthnCredentials.id, credential.id));

  await db
    .delete(credentialChallenges)
    .where(eq(credentialChallenges.id, challengeRecord.id));

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

  await createSession(sessionPayload);

  return NextResponse.json({ verified: true });
}
