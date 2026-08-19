import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { db, webauthnCredentials } from "@/db";
import { eq, and } from "drizzle-orm";

export const DELETE = requireAuth(async (_request, session, context) => {
  const { id } = await context!.params;

  const [credential] = await db
    .select()
    .from(webauthnCredentials)
    .where(and(eq(webauthnCredentials.id, id), eq(webauthnCredentials.staffId, session.staffId)))
    .limit(1);

  if (!credential) {
    return NextResponse.json({ error: "Credential not found" }, { status: 404 });
  }

  await db
    .delete(webauthnCredentials)
    .where(eq(webauthnCredentials.id, id));

  return NextResponse.json({ deleted: true });
});
