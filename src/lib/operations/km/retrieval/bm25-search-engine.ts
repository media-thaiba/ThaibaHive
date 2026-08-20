import { TextTokenizer } from './text-tokenizer';
import { DocumentChunk } from '../km-types';

export interface BM25DocEntry {
  chunk: DocumentChunk;
  tokens: string[];
  docLength: number;
  termFrequencies: Map<string, number>;
  institutionId?: string;
}

export class BM25SearchEngine {
  private documents: Map<string, BM25DocEntry> = new Map();
  private invertedIndex: Map<string, Set<string>> = new Map(); // term -> set of chunkIds
  private avgDocLength = 0;
  private k1 = 1.2;
  private b = 0.75;

  public indexChunk(chunk: DocumentChunk, institutionId: string = 'global'): void {
    const tokens = TextTokenizer.tokenize(chunk.content);
    const termFrequencies = new Map<string, number>();

    for (const token of tokens) {
      termFrequencies.set(token, (termFrequencies.get(token) || 0) + 1);
    }

    const docEntry: BM25DocEntry = {
      chunk,
      tokens,
      docLength: tokens.length,
      termFrequencies,
      institutionId,
    };

    this.documents.set(chunk.chunkId, docEntry);

    for (const token of termFrequencies.keys()) {
      if (!this.invertedIndex.has(token)) {
        this.invertedIndex.set(token, new Set());
      }
      this.invertedIndex.get(token)!.add(chunk.chunkId);
    }

    this.recomputeAvgDocLength();
  }

  public indexChunksBatch(chunks: DocumentChunk[], institutionId: string = 'global'): void {
    for (const chunk of chunks) {
      this.indexChunk(chunk, institutionId);
    }
  }

  /**
   * BM25 Okapi search algorithm
   */
  public search(
    query: string,
    topK: number = 5,
    filter?: { institutionId?: string; category?: string }
  ): Array<{ chunk: DocumentChunk; score: number }> {
    const queryTokens = TextTokenizer.tokenize(query);
    const candidateDocIds = new Set<string>();

    for (const token of queryTokens) {
      const docIds = this.invertedIndex.get(token);
      if (docIds) {
        for (const docId of docIds) {
          candidateDocIds.add(docId);
        }
      }
    }

    const totalDocs = this.documents.size;
    if (totalDocs === 0) return [];

    const scoredResults: Array<{ chunk: DocumentChunk; score: number }> = [];

    for (const docId of candidateDocIds) {
      const doc = this.documents.get(docId)!;

      if (filter?.institutionId && doc.institutionId !== 'global' && doc.institutionId !== filter.institutionId) {
        continue;
      }
      if (filter?.category && doc.chunk.category !== filter.category) {
        continue;
      }

      let docScore = 0;
      for (const token of queryTokens) {
        const tf = doc.termFrequencies.get(token) || 0;
        if (tf === 0) continue;

        const docFreq = this.invertedIndex.get(token)?.size || 1;
        // Standard IDF with smoothing
        const idf = Math.log((totalDocs - docFreq + 0.5) / (docFreq + 0.5) + 1);

        const numerator = tf * (this.k1 + 1);
        const denominator = tf + this.k1 * (1 - this.b + this.b * (doc.docLength / (this.avgDocLength || 1)));

        docScore += idf * (numerator / denominator);
      }

      if (docScore > 0) {
        scoredResults.push({ chunk: doc.chunk, score: docScore });
      }
    }

    scoredResults.sort((a, b) => b.score - a.score);
    return scoredResults.slice(0, topK);
  }

  private recomputeAvgDocLength(): void {
    if (this.documents.size === 0) {
      this.avgDocLength = 0;
      return;
    }
    let total = 0;
    for (const doc of this.documents.values()) {
      total += doc.docLength;
    }
    this.avgDocLength = total / this.documents.size;
  }

  public clear(): void {
    this.documents.clear();
    this.invertedIndex.clear();
    this.avgDocLength = 0;
  }

  public getIndexSize(): number {
    return this.documents.size;
  }
}

export const bm25SearchEngine = new BM25SearchEngine();
