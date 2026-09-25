import { VerificationResolver } from '../../../operations/docgen/crypto/verification-resolver';
import { DocumentSignatureEngine } from '../../../operations/docgen/crypto/document-signature-engine';
import { DocDbStore } from '../../../db/docgen-store';

describe('VerificationResolver & Authenticity Inspector (Sprint-056)', () => {
  beforeEach(() => {
    DocDbStore.getInstance().clearMemoryStore();
  });

  it('should resolve a valid authentic document and increment verification count', async () => {
    const store = DocDbStore.getInstance();
    const sigEngine = DocumentSignatureEngine.getInstance();
    const resolver = VerificationResolver.getInstance();

    const issuedAt = new Date().toISOString();
    const sigRes = await sigEngine.generateSignature({
      institutionId: 'inst-001',
      documentType: 'certificate',
      recipientId: 'stu-001',
      serialNumber: 'TH/BONAFIDE/2026/001',
      issuedAt,
    });

    await store.createGeneratedRecord({
      id: 'rec-001',
      institutionId: 'inst-001',
      documentType: 'certificate',
      recipientType: 'student',
      recipientId: 'stu-001',
      documentHash: sigRes.documentHash,
      serialNumber: 'TH/BONAFIDE/2026/001',
      title: 'Bonafide Student Certificate',
      status: 'valid',
      fileSizeBytes: 1024,
      issuedAt,
      createdAt: issuedAt,
      updatedAt: issuedAt,
    });

    await store.createVerificationSignature({
      id: 'sig-001',
      documentRecordId: 'rec-001',
      documentHash: sigRes.documentHash,
      signature: sigRes.signature,
      signingAlgorithm: sigRes.signingAlgorithm,
      verificationCount: 0,
      revoked: false,
      createdAt: issuedAt,
    });

    const result = await resolver.resolve(sigRes.documentHash);
    expect(result.status).toBe('VALID');
    expect(result.serialNumber).toBe('TH/BONAFIDE/2026/001');
    expect(result.verificationCount).toBe(1);
  });

  it('should return NOT_FOUND for unknown document hashes', async () => {
    const resolver = VerificationResolver.getInstance();
    const result = await resolver.resolve('unknown-hash-999');
    expect(result.status).toBe('NOT_FOUND');
  });
});
