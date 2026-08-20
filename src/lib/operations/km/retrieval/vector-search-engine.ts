import { embeddingClient } from './embedding-client';
import { DocumentChunk } from '../km-types';

export interface IndexedVectorItem {
  chunk: DocumentChunk;
  embedding: number[];
  institutionId?: string;
}

export class VectorSearchEngine {
  private indexedVectors: Map<string, IndexedVectorItem> = new Map();

  public async indexChunk(chunk: DocumentChunk, institutionId: string = 'global'): Promise<void> {
    const embedding = await embeddingClient.generateEmbedding(chunk.content);
    this.indexedVectors.set(chunk.chunkId, {
      chunk,
      embedding,
      institutionId,
    });
  }

  public async indexChunksBatch(chunks: DocumentChunk[], institutionId: string = 'global'): Promise<void> {
    for (const chunk of chunks) {
      await this.indexChunk(chunk, institutionId);
    }
  }

  /**
   * Cosine similarity search over indexed chunks
   */
  public async search(
    query: string,
    topK: number = 5,
    filter?: { institutionId?: string; category?: string }
  ): Promise<Array<{ chunk: DocumentChunk; score: number }>> {
    const queryVector = await embeddingClient.generateEmbedding(query);
    const results: Array<{ chunk: DocumentChunk; score: number }> = [];

    for (const item of this.indexedVectors.values()) {
      if (filter?.institutionId && item.institutionId !== 'global' && item.institutionId !== filter.institutionId) {
        continue;
      }
      if (filter?.category && item.chunk.category !== filter.category) {
        continue;
      }

      const score = this.computeCosineSimilarity(queryVector, item.embedding);
      results.push({ chunk: item.chunk, score });
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }

  public computeCosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length || vecA.length === 0) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) return 0;
    return Math.max(0, Math.min(1, dotProduct / denominator));
  }

  public clear(): void {
    this.indexedVectors.clear();
  }

  public getIndexSize(): number {
    return this.indexedVectors.size;
  }
}

export const vectorSearchEngine = new VectorSearchEngine();
