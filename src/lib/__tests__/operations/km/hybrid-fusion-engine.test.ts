import { HybridFusionEngine } from '@/lib/operations/km/retrieval/hybrid-fusion-engine';

describe('Hybrid Fusion & Cross-Encoder Reranker (KM-005)', () => {
  let engine: HybridFusionEngine;

  beforeEach(() => {
    engine = new HybridFusionEngine();
    engine.clear();
  });

  it('should fuse dense vector and sparse BM25 scores via RRF', async () => {
    await engine.indexDocumentChunk({
      chunkId: 'chk_fee_refund',
      documentId: 'doc_finance',
      documentTitle: 'Tuition Refund Policy',
      category: 'policy',
      chunkIndex: 0,
      content: 'Tuition refunds are processed within 14 calendar days of course withdrawal submission.',
      tokenCount: 12,
      metadata: { section: 'Section 4: Refunds' },
    });

    await engine.indexDocumentChunk({
      chunkId: 'chk_grade_appeal',
      documentId: 'doc_grades',
      documentTitle: 'Grade Appeal Procedures',
      category: 'policy',
      chunkIndex: 0,
      content: 'Grade appeals must be formally filed within 10 days of semester grade publication.',
      tokenCount: 13,
      metadata: { section: 'Section 2: Appeals' },
    });

    const results = await engine.search('How many days for tuition refund?', { topK: 2 });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].chunk.chunkId).toBe('chk_fee_refund');
    expect(results[0].citations.title).toBe('Tuition Refund Policy');
    expect(results[0].citations.section).toBe('Section 4: Refunds');
  });

  it('should apply cross-encoder re-ranking for top candidates', async () => {
    await engine.indexDocumentChunk({
      chunkId: 'chk_cs201_desc',
      documentId: 'doc_courses',
      documentTitle: 'Computer Science Courses',
      category: 'academic',
      chunkIndex: 0,
      content: 'CS-201 Computer Architecture covers digital logic and CPU design.',
      tokenCount: 10,
    });

    const results = await engine.search('CS-201 Computer Architecture', { topK: 1, enableReranking: true });
    expect(results.length).toBe(1);
    expect(results[0].rerankScore).toBeDefined();
    expect(results[0].rerankScore).toBeGreaterThan(0.5);
  });
});
