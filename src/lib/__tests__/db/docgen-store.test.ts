import { DocDbStore } from '../../db/docgen-store';

describe('DocDbStore Data Access Layer (Sprint-056)', () => {
  let store: DocDbStore;

  beforeEach(() => {
    store = DocDbStore.getInstance();
    store.clearMemoryStore();
  });

  it('should create and retrieve templates with institution scoping', async () => {
    await store.createTemplate({
      id: 'tpl-001',
      institutionId: 'inst-001',
      templateCode: 'TPL_REPORT_CARD_V1',
      name: 'Standard Report Card',
      category: 'report_card',
      contentTemplate: '<h1>Report Card for {{student.name}}</h1>',
      version: 1,
      isDefault: true,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const template = await store.getTemplateByCode('TPL_REPORT_CARD_V1', 'inst-001');
    expect(template).toBeDefined();
    expect(template?.name).toBe('Standard Report Card');

    const wrongInst = await store.getTemplateById('tpl-001', 'inst-999');
    expect(wrongInst).toBeNull();
  });

  it('should create and retrieve generated document records and signatures', async () => {
    await store.createGeneratedRecord({
      id: 'rec-001',
      institutionId: 'inst-001',
      documentType: 'report_card',
      recipientType: 'student',
      recipientId: 'stu-101',
      documentHash: 'sha256-abc123hash',
      serialNumber: 'TGCIS/2026/RC/001',
      title: 'Term 1 Report Card',
      status: 'valid',
      fileSizeBytes: 10240,
      issuedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await store.createVerificationSignature({
      id: 'sig-001',
      documentRecordId: 'rec-001',
      documentHash: 'sha256-abc123hash',
      signature: 'mock-sig-bytes-rsa',
      signingAlgorithm: 'sha256WithRSAEncryption',
      verificationCount: 0,
      revoked: false,
      createdAt: new Date().toISOString(),
    });

    const record = await store.getGeneratedRecordByHash('sha256-abc123hash');
    expect(record).toBeDefined();
    expect(record?.serialNumber).toBe('TGCIS/2026/RC/001');

    await store.incrementVerificationCount('sha256-abc123hash');
    const sig = await store.getVerificationSignatureByHash('sha256-abc123hash');
    expect(sig?.verificationCount).toBe(1);
    expect(sig?.lastVerifiedAt).toBeDefined();
  });

  it('should manage export jobs and progress states', async () => {
    await store.createExportJob({
      id: 'exp-001',
      institutionId: 'inst-001',
      userId: 'user-001',
      jobType: 'students',
      format: 'csv',
      status: 'queued',
      progressPercent: 0,
      totalRecords: 500,
      processedRecords: 0,
      fileSizeBytes: 0,
      createdAt: new Date().toISOString(),
    });

    await store.updateExportJobStatus('exp-001', {
      status: 'completed',
      progressPercent: 100,
      processedRecords: 500,
      downloadUrl: '/api/export/download/exp-001.csv',
      fileSizeBytes: 45000,
      completedAt: new Date().toISOString(),
    });

    const job = await store.getExportJobById('exp-001', 'inst-001');
    expect(job?.status).toBe('completed');
    expect(job?.progressPercent).toBe(100);
    expect(job?.downloadUrl).toBe('/api/export/download/exp-001.csv');
  });
});
