import { BM25SearchEngine } from '@/lib/operations/km/retrieval/bm25-search-engine';

describe('BM25 Sparse Lexical Search Engine (KM-004)', () => {
  let engine: BM25SearchEngine;

  beforeEach(() => {
    engine = new BM25SearchEngine();
  });

  it('should index chunks and perform exact code search with high accuracy', () => {
    engine.indexChunk({
      chunkId: 'chk_cs302',
      documentId: 'doc_cs_catalog',
      documentTitle: 'CS Course Catalog',
      category: 'academic',
      chunkIndex: 0,
      content: 'CS-302 Database Management Systems covers relational algebra, SQL queries, indexing, and ACID transactions.',
      tokenCount: 15,
    });

    engine.indexChunk({
      chunkId: 'chk_cs301',
      documentId: 'doc_cs_catalog',
      documentTitle: 'CS Course Catalog',
      category: 'academic',
      chunkIndex: 1,
      content: 'CS-301 Operating Systems covers processes, threads, virtual memory, and file systems.',
      tokenCount: 12,
    });

    const results = engine.search('CS-302 transactions', 2);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].chunk.chunkId).toBe('chk_cs302');
  });

  it('should handle stemming and token normalization', () => {
    engine.indexChunk({
      chunkId: 'chk_grad_req',
      documentId: 'doc_grad',
      documentTitle: 'Graduation Rules',
      category: 'policy',
      chunkIndex: 0,
      content: 'Students graduating in 2026 must complete all required core courses.',
      tokenCount: 10,
    });

    const results = engine.search('graduation requirements', 2);
    expect(results.length).toBe(1);
    expect(results[0].chunk.chunkId).toBe('chk_grad_req');
  });
});
