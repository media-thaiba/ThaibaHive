import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { db } from "@/db";
import { aiRagCorpus } from "@thaiba/db/schema";
import { eq, and } from "drizzle-orm";
import { structureAwareChunker } from "@/lib/ai/rag/chunker";
import { embeddingProvider } from "@/lib/ai/providers/provider-registry";
import { ragCorpusIngestSchema } from "@/lib/validation/schemas";
import { logAIUsage } from "@/lib/ai/usage";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

export const POST = requireAuth(async (request: Request, session) => {
  const institutionId = await resolveRequestInstitution(session);
  const startTime = Date.now();

  try {
    const json = await request.json();
    const parsed = ragCorpusIngestSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { documents } = parsed.data;
    let totalChunks = 0;
    let totalTokens = 0;

    for (const doc of documents) {
      const chunks = await structureAwareChunker.chunkDocument(doc.content, {
        sourceType: doc.sourceType,
        sourceId: doc.sourceId,
        institutionId,
        title: doc.title,
      });

      if (chunks.length === 0) continue;

      const texts = chunks.map(c => c.content);
      const embeddings = await embeddingProvider.embed(texts);
      totalTokens += texts.reduce((sum, t) => sum + Math.ceil(t.length / 4), 0);

      const now = new Date().toISOString();
      const values = chunks.map((chunk, i) => ({
        id: randomUUID(),
        institutionId,
        title: chunk.metadata.title,
        sourceType: chunk.metadata.sourceType,
        sourceId: chunk.metadata.sourceId,
        chunkIndex: chunk.metadata.chunkIndex,
        chunkContent: chunk.content,
        metadataJson: JSON.stringify({
          ...chunk.metadata,
          embedding: embeddings[i],
          tokenCount: chunk.tokenCount,
        }),
        embedding: JSON.stringify(embeddings[i]),
        isActive: true,
        createdAt: now,
        updatedAt: now,
      }));

      await db.insert(aiRagCorpus).values(values).onConflictDoNothing();
      totalChunks += chunks.length;
    }

    const durationMs = Date.now() - startTime;
    await logAIUsage({
      institutionId,
      staffId: session.staffId,
      operation: "rag_ingest",
      model: "embedding",
      inputTokens: totalTokens,
      outputTokens: 0,
      durationMs,
      success: true,
    });

    return NextResponse.json({ success: true, chunksCreated: totalChunks, documentsProcessed: documents.length });
  } catch (error) {
    await logAIUsage({
      institutionId: session.institutionId || "",
      staffId: session.staffId,
      operation: "rag_ingest",
      model: "embedding",
      inputTokens: 0,
      outputTokens: 0,
      durationMs: Date.now() - startTime,
      success: false,
    });
    console.error("[RAG Corpus Ingest] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}, "ai:rag:ingest");

export const DELETE = requireAuth(async (request: Request, session) => {
  const institutionId = await resolveRequestInstitution(session);

  try {
    const { searchParams } = new URL(request.url);
    const sourceType = searchParams.get("sourceType");
    const sourceId = searchParams.get("sourceId");

    if (!sourceType || !sourceId) {
      return NextResponse.json({ error: "sourceType and sourceId required" }, { status: 400 });
    }

    await db
      .delete(aiRagCorpus)
      .where(
        and(
          eq(aiRagCorpus.institutionId, institutionId),
          eq(aiRagCorpus.sourceType, sourceType),
          eq(aiRagCorpus.sourceId, sourceId)
        )
      )
      .run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[RAG Corpus Delete] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}, "ai:rag:ingest");