import { DocDbStore } from '../../../db/docgen-store';
import { DocumentSignatureEngine } from './document-signature-engine';

export interface VerifiedDocumentDetails {
  status: 'VALID' | 'REVOKED' | 'EXPIRED' | 'NOT_FOUND';
  documentHash: string;
  serialNumber?: string;
  documentType?: string;
  title?: string;
  recipientName?: string;
  institutionName?: string;
  issuedAt?: string;
  verificationCount: number;
  lastVerifiedAt?: string;
  authenticityMessage: string;
}

export class VerificationResolver {
  private static instance: VerificationResolver;
  private store: DocDbStore;
  private signatureEngine: DocumentSignatureEngine;

  private constructor() {
    this.store = DocDbStore.getInstance();
    this.signatureEngine = DocumentSignatureEngine.getInstance();
  }

  public static getInstance(): VerificationResolver {
    if (!VerificationResolver.instance) {
      VerificationResolver.instance = new VerificationResolver();
    }
    return VerificationResolver.instance;
  }

  public async resolve(documentHash: string): Promise<VerifiedDocumentDetails> {
    const record = await this.store.getGeneratedRecordByHash(documentHash);
    const signature = await this.store.getVerificationSignatureByHash(documentHash);

    if (!record || !signature) {
      return {
        status: 'NOT_FOUND',
        documentHash,
        verificationCount: 0,
        authenticityMessage: 'No verified academic record exists matching this cryptographic hash.',
      };
    }

    if (signature.revoked || record.status === 'revoked') {
      return {
        status: 'REVOKED',
        documentHash,
        serialNumber: record.serialNumber,
        documentType: record.documentType,
        title: record.title,
        issuedAt: record.issuedAt,
        verificationCount: signature.verificationCount,
        lastVerifiedAt: signature.lastVerifiedAt || undefined,
        authenticityMessage: `This document was officially REVOKED. Reason: ${signature.revokedReason || 'Administrative cancellation'}`,
      };
    }

    // Check expiration
    if (record.expiresAt && new Date(record.expiresAt).getTime() < Date.now()) {
      return {
        status: 'EXPIRED',
        documentHash,
        serialNumber: record.serialNumber,
        documentType: record.documentType,
        title: record.title,
        issuedAt: record.issuedAt,
        verificationCount: signature.verificationCount,
        lastVerifiedAt: signature.lastVerifiedAt || undefined,
        authenticityMessage: 'This academic document has reached its scheduled validity expiration date.',
      };
    }

    // Verify cryptographic signature integrity
    const isCryptoValid = this.signatureEngine.verifySignature(documentHash, signature.signature);
    if (!isCryptoValid) {
      return {
        status: 'REVOKED',
        documentHash,
        serialNumber: record.serialNumber,
        documentType: record.documentType,
        title: record.title,
        issuedAt: record.issuedAt,
        verificationCount: signature.verificationCount,
        authenticityMessage: 'Cryptographic signature mismatch. Document data may have been altered.',
      };
    }

    // Increment verification counter
    await this.store.incrementVerificationCount(documentHash);

    return {
      status: 'VALID',
      documentHash,
      serialNumber: record.serialNumber,
      documentType: record.documentType,
      title: record.title,
      issuedAt: record.issuedAt,
      verificationCount: signature.verificationCount,
      lastVerifiedAt: new Date().toISOString(),
      authenticityMessage: 'Verified Authentic Academic Document signed by Institutional Authority.',
    };
  }
}
