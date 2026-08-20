import { VectorSearchEngine } from '@/lib/operations/km/retrieval/vector-search-engine';

describe('Dense Vector Search Engine (KM-003)', () => {
  let engine: VectorSearchEngine;

  beforeEach(() => {
    engine = new VectorSearchEngine();
  });

  it('should index document chunks and compute cosine similarity', async () => {
    await engine.indexChunk({
      chunkId: 'chk_1',
      documentId: 'doc_grad',
      documentTitle: 'Graduation Policy',
      category: 'policy',
      chunkIndex: 0,
      content: 'A minimum cumulative GPA of 2.0 and 120 credits are required for bachelor degree completion.',
      tokenCount: 18,
    });

    await engine.indexChunk({
      chunkId: 'chk_2',
      documentId: 'doc_parking',
      documentTitle: 'Campus Parking Rules',
      category: 'administrative',
      chunkIndex: 0,
      content: 'Parking permits must be displayed visibly on the vehicle windshield at all campus lots.',
      tokenCount: 15,
    });

    expect(engine.getIndexSize()).toBe(2);

    const results = await engine.search('What is the minimum GPA needed to graduate?', 2);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].chunk.documentId).toBe('doc_grad');
    expect(results[0].score).toBeGreaterThan(0.15);
  });

  it('should respect category and tenant filtering', async () => {
    await engine.indexChunk(
      {
        chunkId: 'chk_t1',
        documentId: 'doc_t1',
        documentTitle: 'CS Curriculum',
        category: 'academic',
        chunkIndex: 0,
        content: 'CS-101 covers algorithms and data structures.',
        tokenCount: 8,
      },
      'tenant_alpha'
    );

    const matchAlpha = await engine.search('algorithms', 5, { institutionId: 'tenant_alpha' });
    expect(matchAlpha.length).toBe(1);

    const matchBeta = await engine.search('algorithms', 5, { institutionId: 'tenant_beta' });
    expect(matchBeta.length).toBe(0);
  });
});
