import { DocumentChunk } from '../km-types';

export interface StructuredCitation {
  citationId: string;
  documentTitle: string;
  category: string;
  section: string;
  pageNumber?: number;
  highlightSnippet: string;
  sourceChunkId: string;
  sourceUrl?: string;
}

export class CitationGenerator {
  /**
   * Generates structured citations with exact source text highlighting.
   */
  public generateCitations(chunks: DocumentChunk[]): StructuredCitation[] {
    return chunks.map((chunk, idx) => ({
      citationId: `cit_${idx + 1}`,
      documentTitle: chunk.documentTitle,
      category: chunk.category,
      section: chunk.metadata?.section || 'General Section',
      pageNumber: chunk.metadata?.pageNumber || 1,
      highlightSnippet: chunk.content.length > 200 ? chunk.content.substring(0, 200) + '...' : chunk.content,
      sourceChunkId: chunk.chunkId,
      sourceUrl: `/portal/copilot/documents/${chunk.documentId}`,
    }));
  }
}

export const citationGenerator = new CitationGenerator();
