import { POST as searchRoute } from '@/app/api/km/search/route';
import { POST as graphQueryRoute } from '@/app/api/km/graph/query/route';
import { GET as getDocs, POST as ingestDoc } from '@/app/api/km/documents/route';
import { GET as getDocItem } from '@/app/api/km/documents/[id]/route';
import { POST as degreeAuditRoute } from '@/app/api/km/advising/audit/route';
import { POST as advisingChatRoute } from '@/app/api/km/advising/chat/route';
import { POST as recommendationsRoute } from '@/app/api/km/advising/recommendations/route';
import { GET as analyticsRoute } from '@/app/api/km/analytics/route';
import { kmStore } from '@/lib/db/km-store';
import { hybridFusionEngine } from '@/lib/operations/km/retrieval/hybrid-fusion-engine';

describe('Knowledge Mesh REST API Suite Integration Tests (KM-021)', () => {
  beforeEach(() => {
    kmStore.clearMemoryStore();
    hybridFusionEngine.clear();
  });

  it('should ingest documents and search via /api/km/search', async () => {
    const ingestReq = new Request('http://localhost/api/km/documents', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Campus Housing Rules 2026',
        category: 'policy',
        fileType: 'md',
        rawText: '# Housing Policy\n\nQuiet hours commence at 10:00 PM on weekdays and 11:00 PM on weekends.',
      }),
    });

    const ingestRes = await ingestDoc(ingestReq);
    expect(ingestRes.status).toBe(201);

    const searchReq = new Request('http://localhost/api/km/search', {
      method: 'POST',
      body: JSON.stringify({
        query: 'What time do quiet hours start?',
        topK: 2,
      }),
    });

    const searchRes = await searchRoute(searchReq);
    expect(searchRes.status).toBe(200);
    const searchData = await searchRes.json();
    expect(searchData.success).toBe(true);
  });

  it('should query the campus knowledge graph via /api/km/graph/query', async () => {
    const graphReq = new Request('http://localhost/api/km/graph/query', {
      method: 'POST',
      body: JSON.stringify({
        startNodeId: 'CS-101',
        maxHops: 2,
      }),
    });

    const graphRes = await graphQueryRoute(graphReq);
    expect(graphRes.status).toBe(200);
    const data = await graphRes.json();
    expect(data.success).toBe(true);
    expect(data.startNode?.name).toBe('Intro to Computer Science');
  });

  it('should execute degree audits via /api/km/advising/audit', async () => {
    const auditReq = new Request('http://localhost/api/km/advising/audit', {
      method: 'POST',
      body: JSON.stringify({
        studentId: 'std_test_001',
        programCode: 'BS-CS',
        transcript: [
          { courseCode: 'CS-101', courseTitle: 'Intro to CS', credits: 4, grade: 'A', term: 'Fall 2024' },
          { courseCode: 'CS-102', courseTitle: 'Data Structures', credits: 4, grade: 'B', term: 'Spring 2025' },
        ],
      }),
    });

    const auditRes = await degreeAuditRoute(auditReq);
    expect(auditRes.status).toBe(200);
    const data = await auditRes.json();
    expect(data.success).toBe(true);
    expect(data.audit.totalCompletedCredits).toBe(8);
  });

  it('should process advising chat via /api/km/advising/chat', async () => {
    const chatReq = new Request('http://localhost/api/km/advising/chat', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: 'sesh_rest_chat',
        studentId: 'std_test_001',
        prompt: 'What courses do I need before taking CS-102?',
      }),
    });

    const chatRes = await advisingChatRoute(chatReq);
    expect(chatRes.status).toBe(200);
    const data = await chatRes.json();
    expect(data.success).toBe(true);
    expect(data.response.answerText).toBeDefined();
  });

  it('should return career and schedule recommendations via /api/km/advising/recommendations', async () => {
    const recReq = new Request('http://localhost/api/km/advising/recommendations', {
      method: 'POST',
      body: JSON.stringify({
        studentId: 'std_test_001',
        type: 'careers',
      }),
    });

    const recRes = await recommendationsRoute(recReq);
    expect(recRes.status).toBe(200);
    const data = await recRes.json();
    expect(data.recommendations.length).toBeGreaterThan(0);
  });

  it('should fetch analytics summary via /api/km/analytics', async () => {
    const analyticsReq = new Request('http://localhost/api/km/analytics');
    const analyticsRes = await analyticsRoute(analyticsReq);
    expect(analyticsRes.status).toBe(200);
    const data = await analyticsRes.json();
    expect(data.success).toBe(true);
    expect(data.analytics.autonomousDeflectionRatePercent).toBeDefined();
  });
});
