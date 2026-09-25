import crypto from 'crypto';
import { DocDbStore } from '../../../db/docgen-store';
import { QrCodeGenerator } from './qr-code-generator';

export interface DocumentSignaturePayload {
  institutionId: string;
  documentType: string;
  recipientId: string;
  serialNumber: string;
  issuedAt: string;
  customData?: Record<string, any>;
}

export interface GeneratedSignatureResult {
  documentHash: string;
  shortHash: string;
  signature: string;
  qrCodeSvg: string;
  verificationUrl: string;
  signingAlgorithm: string;
}

export class DocumentSignatureEngine {
  private static instance: DocumentSignatureEngine;
  private store: DocDbStore;
  private secretKey: string;

  private constructor() {
    this.store = DocDbStore.getInstance();
    this.secretKey = process.env.DOC_SIGNING_SECRET || 'thaibahive-default-ed25519-academic-key-2026';
  }

  public static getInstance(): DocumentSignatureEngine {
    if (!DocumentSignatureEngine.instance) {
      DocumentSignatureEngine.instance = new DocumentSignatureEngine();
    }
    return DocumentSignatureEngine.instance;
  }

  public computePayloadHash(payload: DocumentSignaturePayload): string {
    const canonicalStr = JSON.stringify({
      institutionId: payload.institutionId,
      documentType: payload.documentType,
      recipientId: payload.recipientId,
      serialNumber: payload.serialNumber,
      issuedAt: payload.issuedAt,
      customData: payload.customData || {},
    }, Object.keys(payload).sort());

    return crypto.createHash('sha256').update(canonicalStr).digest('hex');
  }

  public async generateSignature(
    payload: DocumentSignaturePayload,
    baseUrl = 'https://thaibahive.edu'
  ): Promise<GeneratedSignatureResult> {
    const documentHash = this.computePayloadHash(payload);
    const shortHash = documentHash.slice(0, 8);

    // Cryptographic signature using HMAC-SHA256
    const signature = crypto
      .createHmac('sha256', this.secretKey)
      .update(documentHash)
      .digest('base64');

    const verificationUrl = `${baseUrl}/verify/${documentHash}`;
    const qrCodeSvg = QrCodeGenerator.generateSvg(verificationUrl, { size: 100 });

    return {
      documentHash,
      shortHash,
      signature,
      qrCodeSvg,
      verificationUrl,
      signingAlgorithm: 'HMAC-SHA256',
    };
  }

  public verifySignature(documentHash: string, signature: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', this.secretKey)
      .update(documentHash)
      .digest('base64');

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'utf8'),
      Buffer.from(expectedSignature, 'utf8')
    );
  }
}
