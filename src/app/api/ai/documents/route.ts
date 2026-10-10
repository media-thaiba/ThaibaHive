import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { db } from "@/db";
import { aiDocuments, staffInstitutions } from "@thaiba/db/schema";
import { eq, and, desc, SQL } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * GET /api/ai/documents
 * Lists AI documents for the current institution with optional status/type filters.
 */
export const GET = requireAuth(async (request: Request, session) => {
  let institutionId = await resolveRequestInstitution(session);

  if (institutionId === "global") {
    const primary = await db
      .select({ instId: staffInstitutions.institutionId })
      .from(staffInstitutions)
      .where(eq(staffInstitutions.staffId, session.staffId))
      .get();
    if (primary?.instId) {
      institutionId = primary.instId;
    }
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const documentType = url.searchParams.get("documentType");
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10)));
  const offset = Math.max(0, parseInt(url.searchParams.get("offset") || "0", 10));

  const conditions: SQL[] = [];
  if (institutionId && institutionId !== "global") {
    conditions.push(eq(aiDocuments.institutionId, institutionId));
  }

  if (status) {
    conditions.push(eq(aiDocuments.status, status));
  }

  if (documentType) {
    conditions.push(eq(aiDocuments.documentType, documentType));
  }

  const documents = await db
    .select()
    .from(aiDocuments)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(aiDocuments.createdAt))
    .limit(limit)
    .offset(offset)
    .all();

  return NextResponse.json({
    success: true,
    documents,
    limit,
    offset,
  });
}, "ai:documents:upload");
