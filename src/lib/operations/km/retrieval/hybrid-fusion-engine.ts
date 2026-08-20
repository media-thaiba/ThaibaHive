import { vectorSearchEngine } from './vector-search-engine';
import { bm25SearchEngine } from './bm25-search-engine';
import { crossReranker } from './cross-reranker';
import { DocumentChunk, SearchResultItem } from '../km-types';

export interface HybridSearchOptions {
  topK?: number;
  denseWeight?: number;
  sparseWeight?: number;
  rrfConstant?: number; // default 60
  institutionId?: string;
  category?: string;
  enableReranking?: boolean;
}

export class HybridFusionEngine {
  private rrfK = 60;

  /**
   * Reciprocal Rank Fusion (RRF) combining dense and sparse lexical search results
   */
  public async search(query: string, options?: HybridSearchOptions): Promise<SearchResultItem[]> {
    const topK = options?.topK || 5;
    const rrfK = options?.rrfConstant || this.rrfK;
    const enableReranking = options?.enableReranking ?? true;

    const filter = {
      institutionId: options?.institutionId,
      category: options?.category,
    };

    // Parallel fetch from dense vector search and sparse BM25
    const [denseResults, sparseResults] = await Promise.all([
      vectorSearchEngine.search(query, topK * 3, filter),
      Promise.resolve(bm25SearchEngine.search(query, topK * 3, filter)),
    ]);

    const itemMap = new Map<string, SearchResultItem>();

    // Process dense vector ranks
    denseResults.forEach((res, rank) => {
      const chunkId = res.chunk.chunkId;
      const rrfScore = 1.0 / (rrfK + rank + 1);

      if (!itemMap.has(chunkId)) {
        itemMap.set(chunkId, {
          chunk: res.chunk,
          denseScore: res.score,
          fusedScore: rrfScore,
          citations: {
            title: res.chunk.documentTitle,
            section: res.chunk.metadata?.section || 'General',
            pageNumber: res.chunk.metadata?.pageNumber || 1,
          },
        });
      } else {
        const item = itemMap.get(chunkId)!;
        item.denseScore = res.score;
        item.fusedScore += rrfScore;
      }
    });

    // Process sparse BM25 ranks
    sparseResults.forEach((res, rank) => {
      const chunkId = res.chunk.chunkId;
      const rrfScore = 1.0 / (rrfK + rank + 1);

      if (!itemMap.has(chunkId)) {
        itemMap.set(chunkId, {
          chunk: res.chunk,
          sparseScore: res.score,
          fusedScore: rrfScore,
          citations: {
            title: res.chunk.documentTitle,
            section: res.chunk.metadata?.section || 'General',
            pageNumber: res.chunk.metadata?.pageNumber || 1,
          },
        });
      } else {
        const item = itemMap.get(chunkId)!;
        item.sparseScore = res.score;
        item.fusedScore += rrfScore;
      }
    });

    let combined = Array.from(itemMap.values());
    combined.sort((a, b) => b.fusedScore - a.fusedScore);

    if (enableReranking) {
      combined = crossReranker.rerank(query, combined);
    }

    return combined.slice(0, topK);
  }

  public async indexDocumentChunk(chunk: DocumentChunk, institutionId: string = 'global'): Promise<void> {
    await Promise.all([
      vectorSearchEngine.indexChunk(chunk, institutionId),
      Promise.resolve(bm25SearchEngine.indexChunk(chunk, institutionId)),
    ]);
  }

  public async indexBatch(chunks: DocumentChunk[], institutionId: string = 'global'): Promise<void> {
    for (const chunk of chunks) {
      await this.indexDocumentChunk(chunk, institutionId);
    }
  }

  public clear(): void {
    vectorSearchEngine.clear();
    bm25SearchEngine.clear();
  }
}

export const hybridFusionEngine = new HybridFusionEngine();
