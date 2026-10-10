import { db } from "@/db";
import { aiRagCorpus } from "@thaiba/db/schema";
import { eq, and } from "drizzle-orm";
import { embeddingProvider } from "@/lib/ai/providers/provider-registry";

export interface SearchResult {
  id: string;
  content: string;
  metadata: {
    sourceType: string;
    sourceId: string;
    title: string;
    chunkIndex: number;
    headingPath: string[];
    tableContext?: {
      tableIndex: number;
      rowIndex: number;
      headers: string[];
    };
  };
  score: number;
  searchType: "vector" | "keyword" | "hybrid";
}

export interface HybridSearchOptions {
  institutionId: string;
  query: string;
  topK?: number;
  vectorWeight?: number;
  keywordWeight?: number;
  sourceTypes?: string[];
  minScore?: number;
}

interface VectorSearchResult {
  id: string;
  content: string;
  metadata: any;
  distance: number;
}

interface KeywordSearchResult {
  id: string;
  content: string;
  metadata: any;
  rank: number;
}

function bm25Score(query: string, document: string, avgDocLen: number, docCount: number): number {
  const k1 = 1.5;
  const b = 0.75;
  const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 1);
  const docTerms = document.toLowerCase().split(/\s+/);
  const docLen = docTerms.length;

  let score = 0;
  for (const term of queryTerms) {
    const tf = docTerms.filter(t => t === term).length;
    if (tf === 0) continue;
    const idf = Math.log((docCount - 0.5) / (0.5 + 1));
    const numerator = tf * (k1 + 1);
    const denominator = tf + k1 * (1 - b + b * (docLen / avgDocLen));
    score += idf * (numerator / denominator);
  }
  return score;
}

function parseEmbedding(embedding: string | null): number[] | null {
  if (!embedding) return null;
  try {
    return JSON.parse(embedding);
  } catch {
    return null;
  }
}

function parseMetadata(metadataJson: string | null): any {
  if (!metadataJson) return {};
  try {
    return JSON.parse(metadataJson);
  } catch {
    return {};
  }
}

export class HybridSearchEngine {
  private avgDocLen: number = 200;
  private docCount: number = 1000;

  async search(options: HybridSearchOptions): Promise<SearchResult[]> {
    const {
      institutionId,
      query,
      topK = 10,
      vectorWeight = 0.6,
      keywordWeight = 0.4,
      sourceTypes,
      minScore = 0.1,
    } = options;

    const queryEmbedding = await embeddingProvider.embed([query]);
    const queryVector = queryEmbedding[0];

    const [vectorResults, keywordResults] = await Promise.all([
      this.vectorSearch(institutionId, queryVector, topK * 2, sourceTypes),
      this.keywordSearch(institutionId, query, topK * 2, sourceTypes),
    ]);

    const fusedResults = this.reciprocalRankFusion(vectorResults, keywordResults, vectorWeight, keywordWeight);
    const filtered = fusedResults.filter(r => r.score >= minScore).slice(0, topK);

    return await this.verifyGroundedness(filtered, query);
  }

  private async vectorSearch(
    institutionId: string,
    queryVector: number[],
    topK: number,
    sourceTypes?: string[]
  ): Promise<VectorSearchResult[]> {
    // In-memory vector search for SQLite (and Postgres fallback)
    const all = await db
      .select({
        id: aiRagCorpus.id,
        chunkContent: aiRagCorpus.chunkContent,
        metadataJson: aiRagCorpus.metadataJson,
        embedding: aiRagCorpus.embedding,
        sourceType: aiRagCorpus.sourceType,
        title: aiRagCorpus.title,
        chunkIndex: aiRagCorpus.chunkIndex,
        sourceId: aiRagCorpus.sourceId,
      })
      .from(aiRagCorpus)
      .where(
        and(
          eq(aiRagCorpus.institutionId, institutionId),
          eq(aiRagCorpus.isActive, true)
        )
      )
      .all();

    const withScores = all
      .filter(row => {
        if (sourceTypes && sourceTypes.length > 0) {
          return sourceTypes.includes(row.sourceType);
        }
        return true;
      })
      .map(row => {
        const embedding = parseEmbedding(row.embedding);
        if (!embedding) return { ...row, distance: 1 };
        const distance = this.cosineDistance(queryVector, embedding);
        return { ...row, distance };
      });

    withScores.sort((a, b) => a.distance - b.distance);
    return withScores.slice(0, topK).map(r => ({
      id: r.id,
      content: r.chunkContent,
      metadata: parseMetadata(r.metadataJson),
      distance: r.distance,
    }));
  }

  private cosineDistance(a: number[], b: number[]): number {
    if (a.length !== b.length) return 1;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return 1;
    return 1 - dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private async keywordSearch(
    institutionId: string,
    query: string,
    topK: number,
    sourceTypes?: string[]
  ): Promise<KeywordSearchResult[]> {
    const all = await db
      .select({
        id: aiRagCorpus.id,
        chunkContent: aiRagCorpus.chunkContent,
        metadataJson: aiRagCorpus.metadataJson,
        sourceType: aiRagCorpus.sourceType,
        title: aiRagCorpus.title,
        chunkIndex: aiRagCorpus.chunkIndex,
        sourceId: aiRagCorpus.sourceId,
      })
      .from(aiRagCorpus)
      .where(
        and(
          eq(aiRagCorpus.institutionId, institutionId),
          eq(aiRagCorpus.isActive, true)
        )
      )
      .all();

    this.docCount = all.length;
    this.avgDocLen = all.reduce((sum, r) => sum + r.chunkContent.length, 0) / Math.max(1, all.length);

    const scored = all
      .filter(row => {
        if (sourceTypes && sourceTypes.length > 0) {
          return sourceTypes.includes(row.sourceType);
        }
        return true;
      })
      .map(row => {
        const score = bm25Score(query, row.chunkContent, this.avgDocLen, this.docCount);
        return { ...row, score };
      })
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return scored.map((r, idx) => ({
      id: r.id,
      content: r.chunkContent,
      metadata: parseMetadata(r.metadataJson),
      rank: idx + 1,
    }));
  }

  private reciprocalRankFusion(
    vectorResults: VectorSearchResult[],
    keywordResults: KeywordSearchResult[],
    vectorWeight: number,
    keywordWeight: number
  ): SearchResult[] {
    const k = 60;
    const scores = new Map<string, { result: SearchResult; score: number }>();

    vectorResults.forEach((r, idx) => {
      const rrfScore = vectorWeight / (k + idx + 1);
      const existing = scores.get(r.id);
      if (!existing || existing.score < rrfScore) {
        scores.set(r.id, {
          result: {
            id: r.id,
            content: r.content,
            metadata: r.metadata,
            score: rrfScore,
            searchType: "vector",
          },
          score: rrfScore,
        });
      }
    });

    keywordResults.forEach((r, idx) => {
      const rrfScore = keywordWeight / (k + idx + 1);
      const existing = scores.get(r.id);
      if (!existing || existing.score < rrfScore) {
        scores.set(r.id, {
          result: {
            id: r.id,
            content: r.content,
            metadata: r.metadata,
            score: rrfScore,
            searchType: "keyword",
          },
          score: rrfScore,
        });
      } else {
        existing.score += rrfScore;
        existing.result.searchType = "hybrid";
      }
    });

    return Array.from(scores.values())
      .sort((a, b) => b.score - a.score)
      .map(s => s.result);
  }

  private async verifyGroundedness(
    results: SearchResult[],
    query: string
  ): Promise<SearchResult[]> {
    const verified = await Promise.all(
      results.map(async (result) => {
        const grounded = await this.checkGroundedness(query, result.content);
        return {
          ...result,
          score: result.score * grounded.confidence,
          metadata: {
            ...result.metadata,
            groundedness: grounded,
          },
        };
      })
    );

    return verified.sort((a, b) => b.score - a.score);
  }

  private async checkGroundedness(query: string, context: string): Promise<{ confidence: number; supported: boolean }> {
    const queryLower = query.toLowerCase();
    const contextLower = context.toLowerCase();
    const queryTerms = queryLower.split(/\s+/).filter(t => t.length > 2);
    const supportedTerms = queryTerms.filter(t => contextLower.includes(t));
    const confidence = queryTerms.length > 0 ? supportedTerms.length / queryTerms.length : 0;
    return { confidence, supported: confidence > 0.5 };
  }
}

export const hybridSearchEngine = new HybridSearchEngine();