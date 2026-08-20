import { DocumentChunk, SearchResultItem } from '../km-types';

export class CrossReranker {
  /**
   * Re-ranks top-K candidate chunks using fine-grained token co-occurrence and position heuristics
   */
  public rerank(query: string, candidates: SearchResultItem[]): SearchResultItem[] {
    const queryTerms = query.toLowerCase().split(/\W+/).filter(Boolean);

    for (const item of candidates) {
      const contentLower = item.chunk.content.toLowerCase();
      let matchCount = 0;
      let exactPhraseBonus = 0;
      let titleBonus = 0;

      // Exact phrase match bonus
      if (contentLower.includes(query.toLowerCase())) {
        exactPhraseBonus = 0.3;
      }

      // Title relevance bonus
      if (item.chunk.documentTitle.toLowerCase().includes(query.toLowerCase())) {
        titleBonus = 0.2;
      }

      // Term coverage
      for (const term of queryTerms) {
        if (contentLower.includes(term)) {
          matchCount++;
        }
      }

      const coverageRatio = queryTerms.length > 0 ? matchCount / queryTerms.length : 0;
      const rerankScore = item.fusedScore * 0.5 + coverageRatio * 0.3 + exactPhraseBonus + titleBonus;

      item.rerankScore = Math.min(1.0, rerankScore);
    }

    return [...candidates].sort((a, b) => (b.rerankScore || 0) - (a.rerankScore || 0));
  }
}

export const crossReranker = new CrossReranker();
