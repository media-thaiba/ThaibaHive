import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { db } from "@/db";
import { aiDocuments } from "@thaiba/db/schema";
import { confirmAiDocumentSchema } from "@/lib/validation/schemas";
import { eq, and, SQL } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * POST /api/ai/documents/[id]/confirm
 * Human-in-the-loop confirmation and correction of extracted document data.
 */
export const POST = requireAuth(async (request: Request, session, context) => {
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

  const doc = await db
    .select()
    .from(aiDocuments)
    .where(and(...conditions))
    .get();

  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    // Empty body is acceptable if confirming extracted data as-is
  }

  const parsed = confirmAiDocumentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const updatedData = {
    status: "confirmed",
    confirmedById: session.staffId,
    confirmedAt: now,
    extractedDataJson: parsed.data.confirmedData
      ? JSON.stringify(parsed.data.confirmedData)
      : doc.extractedDataJson,
    targetEntityType: parsed.data.targetEntityType || doc.targetEntityType,
    targetEntityId: parsed.data.targetEntityId || doc.targetEntityId,
    updatedAt: now,
  };

  await db
    .update(aiDocuments)
    .set(updatedData)
    .where(and(...conditions));

  const updatedDoc = {
    ...doc,
    ...updatedData,
  };

  return NextResponse.json({
    success: true,
    document: updatedDoc,
  });
}, "ai:documents:confirm");
