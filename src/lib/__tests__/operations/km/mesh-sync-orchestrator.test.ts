import { meshSyncOrchestrator } from '@/lib/operations/km/ingestion/mesh-sync-orchestrator';
import { campusGraph } from '@/lib/operations/km/graph/knowledge-graph-engine';
import { hybridFusionEngine } from '@/lib/operations/km/retrieval/hybrid-fusion-engine';
import { kmStore } from '@/lib/db/km-store';

describe('Knowledge Mesh Sync Orchestrator (KM-007)', () => {
  beforeEach(() => {
    meshSyncOrchestrator.clear();
    kmStore.clearMemoryStore();
    hybridFusionEngine.clear();
  });

  it('should execute full end-to-end document ingestion into graph, search index and database', async () => {
    const syllabusText = `
# CS-350 Software Engineering

## Course Description
CS-350 covers agile methodology, CI/CD automation, testing, and software design patterns.

## Prerequisites
Prerequisite: CS-102
`;

    const result = await meshSyncOrchestrator.ingestDocument(syllabusText, {
      documentId: 'doc_cs350_syllabus',
      title: 'CS-350 Syllabus',
      category: 'academic',
      fileType: 'md',
      institutionId: 'inst_main',
    });

    expect(result.status).toBe('indexed');
    expect(result.totalChunks).toBeGreaterThan(0);
    expect(result.entitiesExtracted).toBeGreaterThan(0);

    // Verify node and edge in knowledge graph
    const cs350Node = campusGraph.getNode('CS-350');
    expect(cs350Node).toBeDefined();

    // Verify hybrid search can find this newly ingested syllabus
    const searchResults = await hybridFusionEngine.search('agile methodology and software design patterns', {
      institutionId: 'inst_main',
    });
    expect(searchResults.length).toBeGreaterThan(0);
    expect(searchResults[0].chunk.documentId).toBe('doc_cs350_syllabus');
  });

  it('should skip duplicate unchanged document uploads via content hash detection', async () => {
    const sampleText = '# Policy Document\n\nCampus hours are 8:00 AM to 10:00 PM.';

    const firstRun = await meshSyncOrchestrator.ingestDocument(sampleText, {
      documentId: 'doc_policy_01',
      title: 'Campus Hours Policy',
    });
    expect(firstRun.status).toBe('indexed');

    const duplicateRun = await meshSyncOrchestrator.ingestDocument(sampleText, {
      documentId: 'doc_policy_01',
      title: 'Campus Hours Policy',
    });
    expect(duplicateRun.status).toBe('skipped_duplicate');
    expect(duplicateRun.totalChunks).toBe(0);
  });
});
