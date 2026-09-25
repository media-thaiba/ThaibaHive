import { CertificateGenerator } from '../../../operations/docgen/pdf/certificate-generator';
import { DocDbStore } from '../../../db/docgen-store';

describe('CertificateGenerator Production Engine (Sprint-056)', () => {
  beforeEach(() => {
    DocDbStore.getInstance().clearMemoryStore();
  });

  it('should generate official bonafide certificate with QR verification', async () => {
    const generator = CertificateGenerator.getInstance();
    const result = await generator.generateCertificate({
      institution: {
        id: 'inst-tgcis',
        name: 'Thaiba Garden College of Integrated Studies',
        city: 'Venjaramoodu',
      },
      certificateType: 'bonafide',
      academicYear: '2025-2026',
      recipient: {
        id: 'stu-771',
        name: 'Mohammed Shafi',
        rollNumber: 'TGCIS-2026-771',
        className: 'First Year B.A Islamic History',
        guardianName: 'Ibrahim Kutty',
        purpose: 'Higher Education Scholarship Application',
      },
    });

    expect(result.recordId).toBeDefined();
    expect(result.serialNumber).toContain('BONAFIDE');
    expect(result.serialNumber).toContain('TGCIS2026771');
    expect(result.documentHash).toBeDefined();
    expect(result.renderedHtml).toContain('BONAFIDE CERTIFICATE');
    expect(result.renderedHtml).toContain('Mohammed Shafi');
    expect(result.renderedHtml).toContain('Higher Education Scholarship Application');

    const stored = await DocDbStore.getInstance().getGeneratedRecordByHash(result.documentHash);
    expect(stored).toBeDefined();
    expect(stored?.documentType).toBe('certificate');
  });
});
