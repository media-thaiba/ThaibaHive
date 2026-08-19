import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { db, webauthnCredentials } from "@/db";
import { eq } from "drizzle-orm";

export const GET = requireAuth(async (_request, session) => {
  const credentials = await db
    .select()
    .from(webauthnCredentials)
    .where(eq(webauthnCredentials.staffId, session.staffId));

  return NextResponse.json({ credentials });
});
