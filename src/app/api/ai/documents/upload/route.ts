import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { db } from "@/db";
import { aiDocuments, staffInstitutions } from "@thaiba/db/schema";
import { uploadAiDocumentSchema } from "@/lib/validation/schemas";
import { documentExtractor } from "@/lib/ai/document/extractor";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

/**
 * POST /api/ai/documents/upload
 * Processes and extracts structured data from uploaded documents/images with DLP sanitization.
 */
export const POST = requireAuth(async (request: Request, session) => {
  let institutionId = await resolveRequestInstitution(session);

  // If session resolved to global, pick staff's active institution
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

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = uploadAiDocumentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const {
    fileName,
    mimeType,
    documentType,
    fileUrl,
    rawText,
    fileBase64,
    fileSizeBytes = 0,
    targetEntityType,
    targetEntityId,
  } = parsed.data;

  let imageBuffer: Buffer | undefined;
  if (fileBase64) {
    try {
      imageBuffer = Buffer.from(fileBase64, "base64");
    } catch {
      // Ignore invalid base64 and fallback to text
    }
  }

  // Perform extraction with DLP and confidence evaluation
  const extractionResult = await documentExtractor.extract({
    fileName,
    mimeType,
    documentType,
    rawText,
    imageBuffer,
    institutionId,
  });

  const docId = randomUUID();
  const now = new Date().toISOString();
  const resolvedFileUrl = fileUrl || `/uploads/ai-docs/${docId}-${fileName}`;

  const newDoc = {
    id: docId,
    institutionId,
    uploadedById: session.staffId,
    fileUrl: resolvedFileUrl,
    fileName,
    fileSizeBytes: fileSizeBytes || (imageBuffer ? imageBuffer.length : (rawText?.length || 1024)),
    mimeType,
    documentType,
    status: extractionResult.status,
    confidenceScore: extractionResult.confidence.score,
    extractedDataJson: JSON.stringify(extractionResult.extractedData),
    validationErrorsJson: JSON.stringify(extractionResult.confidence.validationErrors),
    targetEntityType: targetEntityType || null,
    targetEntityId: targetEntityId || null,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(aiDocuments).values({
    id: docId,
    institutionId,
    uploadedById: session.staffId,
    fileUrl: resolvedFileUrl,
    fileName,
    fileSizeBytes: fileSizeBytes || (imageBuffer ? imageBuffer.length : (rawText?.length || 1024)),
    mimeType,
    documentType,
    status: extractionResult.status,
    confidenceScore: extractionResult.confidence.score,
    extractedDataJson: JSON.stringify(extractionResult.extractedData),
    validationErrorsJson: JSON.stringify(extractionResult.confidence.validationErrors),
    targetEntityType: targetEntityType || null,
    targetEntityId: targetEntityId || null,
    createdAt: now,
    updatedAt: now,
  });

  return NextResponse.json(
    {
      success: true,
      document: newDoc,
      extraction: extractionResult,
    },
    { status: 201 }
  );
}, "ai:documents:upload");
