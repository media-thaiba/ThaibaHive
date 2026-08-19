import { NextResponse } from "next/server";
import { db, credentialChallenges, staff, webauthnCredentials } from "@/db";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  const { email } = await request.json().catch(() => ({ email: undefined }));

  let foundUser = null;
  let allowCredentials: { id: string; type: "public-key" }[] = [];

  if (email) {
    const [user] = await db
      .select()
      .from(staff)
      .where(eq(staff.email, email))
      .limit(1);

    if (user) {
      foundUser = user;
      const creds = await db
        .select()
        .from(webauthnCredentials)
        .where(eq(webauthnCredentials.staffId, user.id));

      allowCredentials = creds.map((c) => ({
        id: c.credentialId,
        type: "public-key" as const,
      }));
    }
  }

  const challenge = crypto.randomUUID();
  const hostname = new URL(request.url).hostname;
  const expiresAt = new Date(Date.now() + 120 * 1000).toISOString();

  await db.insert(credentialChallenges).values({
    id: crypto.randomUUID(),
    staffId: foundUser?.id || null,
    challenge,
    type: "authentication",
    expiresAt,
  });

  const options: Record<string, unknown> = {
    challenge: Buffer.from(challenge).toString("base64url"),
    rpId: hostname,
    timeout: 60000,
    userVerification: "preferred",
  };

  if (allowCredentials.length > 0) {
    options.allowCredentials = allowCredentials;
  }

  return NextResponse.json(options);
}
