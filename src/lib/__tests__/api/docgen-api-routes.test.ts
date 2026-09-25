import { GET as getTemplates, POST as createTemplate } from '../../../app/api/docgen/templates/route';
import { POST as generateDoc } from '../../../app/api/docgen/generate/route';
import { POST as exportStream } from '../../../app/api/export/stream/route';
import { POST as registerMobileToken } from '../../../app/api/docgen/mobile/tokens/route';
import { GET as syncMobile } from '../../../app/api/docgen/mobile/sync/route';
import { GET as verifyDoc } from '../../../app/api/verify/[docHash]/route';
import { DocDbStore } from '../../db/docgen-store';

describe('DOC-GEN & ExportHub REST API Routes (Sprint-056)', () => {
  beforeEach(() => {
    DocDbStore.getInstance().clearMemoryStore();
  });

  const mockAdminReq = (body?: any, searchParams?: Record<string, string>): Request => {
    const url = new URL('https://thaiba.edu/api/test');
    if (searchParams) {
      for (const [k, v] of Object.entries(searchParams)) {
        url.searchParams.set(k, v);
      }
    }
    return new Request(url.toString(), {
      method: body ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer mock-jwt-token-admin',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  };

  it('should list all available document templates via GET /api/docgen/templates', async () => {
    const req = mockAdminReq(undefined, { institutionId: 'inst-001' });
    const res = await (getTemplates as any)(req, { userId: 'u-1', role: 'admin', institutionId: 'inst-001' });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.templates.length).toBeGreaterThanOrEqual(3);
  });

  it('should generate an academic report card via POST /api/docgen/generate', async () => {
    const body = {
      institutionId: 'inst-001',
      documentType: 'report_card',
      recipientId: 'stu-101',
      recipientName: 'Bilal Hameed',
      rollNumber: 'CS-101',
      academicYear: '2025-2026',
      termOrExamName: 'First Term',
      subjects: [
        { subjectName: 'Computer Science', maxMarks: 100, marksObtained: 90 },
      ],
    };

    const req = mockAdminReq(body);
    const res = await (generateDoc as any)(req, { userId: 'u-1', role: 'admin', institutionId: 'inst-001' });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.result.serialNumber).toBeDefined();
    expect(data.result.renderedHtml).toContain('Bilal Hameed');
  });

  it('should stream CSV export via POST /api/export/stream', async () => {
    const body = {
      institutionId: 'inst-001',
      jobType: 'students',
      format: 'csv',
      data: [{ rollNumber: 'R1', name: 'Test Student' }],
    };

    const req = mockAdminReq(body);
    const res = await (exportStream as any)(req, { userId: 'u-1', role: 'admin', institutionId: 'inst-001' });

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/csv');
    const text = await res.text();
    expect(text).toContain('Test Student');
  });

  it('should register mobile device tokens via POST /api/docgen/mobile/tokens', async () => {
    const body = {
      userId: 'user-001',
      institutionId: 'inst-001',
      deviceToken: 'fcm-mock-token-xyz-123',
      platform: 'android',
    };

    const req = mockAdminReq(body);
    const res = await (registerMobileToken as any)(req, { userId: 'user-001', role: 'staff', institutionId: 'inst-001' });
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.token.deviceToken).toBe('fcm-mock-token-xyz-123');
  });

  it('should verify document via public GET /api/verify/[docHash]', async () => {
    const req = new Request('https://thaiba.edu/api/verify/test-hash', { method: 'GET' });
    const res = await (verifyDoc as any)(req, { params: Promise.resolve({ docHash: 'nonexistent-hash' }) });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.result.status).toBe('NOT_FOUND');
  });
});
