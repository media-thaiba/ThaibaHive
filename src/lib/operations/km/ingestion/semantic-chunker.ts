import { ParsedDocument } from './document-parser';
import { DocumentChunk } from '../km-types';

export interface ChunkingOptions {
  maxTokensPerChunk?: number; // default 500
  overlapTokens?: number; // default 50
}

export class SemanticChunker {
  private defaultMaxTokens = 500;
  private defaultOverlap = 50;

  /**
   * Splits a parsed document into semantically coherent chunks preserving section contexts.
   */
  public chunkDocument(doc: ParsedDocument, options?: ChunkingOptions): DocumentChunk[] {
    const maxTokens = options?.maxTokensPerChunk || this.defaultMaxTokens;
    const overlap = options?.overlapTokens || this.defaultOverlap;
    const chunks: DocumentChunk[] = [];

    let chunkCounter = 0;

    for (const section of doc.sections) {
      const paragraphs = section.body.split(/\n\n+/).filter((p) => p.trim().length > 0);

      let currentChunkText = `[Section: ${section.heading}]\n`;
      let currentTokenCount = this.estimateTokenCount(currentChunkText);

      for (const para of paragraphs) {
        const paraTokenCount = this.estimateTokenCount(para);

        if (currentTokenCount + paraTokenCount > maxTokens && currentTokenCount > 50) {
          chunks.push({
            chunkId: `${doc.documentId}_chk_${chunkCounter++}`,
            documentId: doc.documentId,
            documentTitle: doc.title,
            category: doc.category,
            chunkIndex: chunkCounter - 1,
            content: currentChunkText.trim(),
            tokenCount: currentTokenCount,
            metadata: {
              section: section.heading,
              level: section.level,
              ...doc.metadata,
            },
          });

          // Retain overlapping tail
          const sentences = currentChunkText.split(/(?<=[.?!])\s+/);
          const overlapText = sentences.slice(-2).join(' ');
          currentChunkText = `[Section: ${section.heading}]\n${overlapText}\n${para}\n`;
          currentTokenCount = this.estimateTokenCount(currentChunkText);
        } else {
          currentChunkText += `${para}\n\n`;
          currentTokenCount += paraTokenCount;
        }
      }

      if (currentChunkText.trim().length > 0) {
        chunks.push({
          chunkId: `${doc.documentId}_chk_${chunkCounter++}`,
          documentId: doc.documentId,
          documentTitle: doc.title,
          category: doc.category,
          chunkIndex: chunkCounter - 1,
          content: currentChunkText.trim(),
          tokenCount: currentTokenCount,
          metadata: {
            section: section.heading,
            level: section.level,
            ...doc.metadata,
          },
        });
      }
    }

    return chunks;
  }

  public estimateTokenCount(text: string): number {
    return Math.ceil(text.trim().split(/\s+/).filter(Boolean).length * 1.3);
  }
}

export const semanticChunker = new SemanticChunker();
