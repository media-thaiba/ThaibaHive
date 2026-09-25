import { DocumentSignatureEngine } from '../../../operations/docgen/crypto/document-signature-engine';
import { QrCodeGenerator } from '../../../operations/docgen/crypto/qr-code-generator';

describe('DocumentSignatureEngine & QrCodeGenerator (Sprint-056)', () => {
  describe('QrCodeGenerator', () => {
    it('should generate valid vector SVG matrix with finder patterns', () => {
      const svg = QrCodeGenerator.generateSvg('https://thaibahive.edu/verify/test-hash-12345', { size: 150 });
      expect(svg).toContain('<svg');
      expect(svg).toContain('viewBox="0 0 150 150"');
      expect(svg).toContain('</svg>');
      expect(svg).toContain('<rect');
    });
  });

  describe('DocumentSignatureEngine', () => {
    const engine = DocumentSignatureEngine.getInstance();

    it('should generate deterministic canonical hash and HMAC signature', async () => {
      const payload = {
        institutionId: 'inst-001',
        documentType: 'report_card',
        recipientId: 'stu-101',
        serialNumber: 'TH/RC/2026/101',
        issuedAt: '2026-08-27T00:00:00.000Z',
      };

      const result = await engine.generateSignature(payload);
      expect(result.documentHash).toHaveLength(64); // SHA-256 is 64 hex chars
      expect(result.shortHash).toBe(result.documentHash.slice(0, 8));
      expect(result.signature).toBeDefined();
      expect(result.verificationUrl).toContain(result.documentHash);
      expect(result.qrCodeSvg).toContain('<svg');

      const isValid = engine.verifySignature(result.documentHash, result.signature);
      expect(isValid).toBe(true);
    });

    it('should reject tampered document signatures', async () => {
      const payload = {
        institutionId: 'inst-001',
        documentType: 'report_card',
        recipientId: 'stu-101',
        serialNumber: 'TH/RC/2026/101',
        issuedAt: '2026-08-27T00:00:00.000Z',
      };

      const result = await engine.generateSignature(payload);
      const tamperedHash = 'f' + result.documentHash.slice(1);
      const isValid = engine.verifySignature(tamperedHash, result.signature);
      expect(isValid).toBe(false);
    });
  });
});
