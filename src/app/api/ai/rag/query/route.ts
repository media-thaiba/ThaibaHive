import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { hybridSearchEngine } from "@/lib/ai/rag/hybrid-search";
import { ragQuerySchema } from "@/lib/validation/schemas";
import { logAIUsage } from "@/lib/ai/usage";

export const dynamic = "force-dynamic";

export const POST = requireAuth(async (request: Request, session) => {
  const institutionId = await resolveRequestInstitution(session);
  const startTime = Date.now();

  try {
    const json = await request.json();
    const parsed = ragQuerySchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { query, topK, vectorWeight, keywordWeight, sourceTypes, minScore } = parsed.data;

    const results = await hybridSearchEngine.search({
      institutionId,
      query,
      topK,
      vectorWeight,
      keywordWeight,
      sourceTypes,
      minScore,
    });

    const durationMs = Date.now() - startTime;
    await logAIUsage({
      institutionId,
      staffId: session.staffId,
      operation: "rag_query",
      model: "hybrid-search",
      inputTokens: Math.ceil(query.length / 4),
      outputTokens: results.reduce((sum, r) => sum + Math.ceil(r.content.length / 4), 0),
      durationMs,
      success: true,
    });

    return NextResponse.json({ results });
  } catch (error) {
    await logAIUsage({
      institutionId,
      staffId: session.staffId,
      operation: "rag_query",
      model: "hybrid-search",
      inputTokens: 0,
      outputTokens: 0,
      durationMs: Date.now() - startTime,
      success: false,
    });
    console.error("[RAG Query] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}, "ai:rag:query");