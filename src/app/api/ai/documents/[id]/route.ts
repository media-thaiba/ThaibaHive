import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { db } from "@/db";
import { aiDocuments } from "@thaiba/db/schema";
import { eq, and, SQL } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * GET /api/ai/documents/[id]
 * Retrieves a single AI document record scoped to the authenticated tenant.
 */
export const GET = requireAuth(async (request: Request, session, context) => {
  const institutionId = await resolveRequestInstitution(session);
  const rawParams = context?.params ? await context.params : {};
  const id = rawParams.id;

  if (!id) {
    return NextResponse.json({ error: "Document ID required" }, { status: 400 });
  }

  const conditions: SQL[] = [eq(aiDocuments.id, id)];
  if (institutionId && institutionId !== "global") {
    conditions.push(eq(aiDocuments.institutionId, institutionId));
  }

  const document = await db
    .select()
    .from(aiDocuments)
    .where(and(...conditions))
    .get();

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    document,
  });
}, "ai:documents:upload");

/**
 * DELETE /api/ai/documents/[id]
 * Deletes a single AI document record scoped to the authenticated tenant.
 */
export const DELETE = requireAuth(async (request: Request, session, context) => {
  const institutionId = await resolveRequestInstitution(session);
  const rawParams = context?.params ? await context.params : {};
  const id = rawParams.id;

  if (!id) {
    return NextResponse.json({ error: "Document ID required" }, { status: 400 });
  }

  const conditions: SQL[] = [eq(aiDocuments.id, id)];
  if (institutionId && institutionId !== "global") {
    conditions.push(eq(aiDocuments.institutionId, institutionId));
  }

  const document = await db
    .select()
    .from(aiDocuments)
    .where(and(...conditions))
    .get();

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  await db
    .delete(aiDocuments)
    .where(and(...conditions));

  return NextResponse.json({
    success: true,
  });
}, "ai:documents:upload");
