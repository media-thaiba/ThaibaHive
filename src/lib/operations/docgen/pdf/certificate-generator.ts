import { AcademicCertificateInput, GeneratedCertificateResult } from './certificate-types';
import { TemplateEngine } from '../templates/template-engine';
import { DocumentSignatureEngine } from '../crypto/document-signature-engine';
import { DocDbStore } from '../../../db/docgen-store';
import { DocGeneratedRecordItem } from '../docgen-types';

export class CertificateGenerator {
  private static instance: CertificateGenerator;
  private templateEngine: TemplateEngine;
  private signatureEngine: DocumentSignatureEngine;
  private store: DocDbStore;

  private constructor() {
    this.templateEngine = TemplateEngine.getInstance();
    this.signatureEngine = DocumentSignatureEngine.getInstance();
    this.store = DocDbStore.getInstance();
  }

  public static getInstance(): CertificateGenerator {
    if (!CertificateGenerator.instance) {
      CertificateGenerator.instance = new CertificateGenerator();
    }
    return CertificateGenerator.instance;
  }

  public async generateCertificate(input: AcademicCertificateInput): Promise<GeneratedCertificateResult> {
    const templateCode = input.templateCode || 'STD_BONAFIDE_CERTIFICATE_V1';
    const issuedAt = input.issuedAt || new Date().toISOString();
    const typeCode = input.certificateType.toUpperCase();
    const serialNumber = `TH/${typeCode}/${input.academicYear.replace(/[^0-9]/g, '')}/${input.recipient.rollNumber.replace(/[^a-zA-Z0-9]/g, '')}`;

    // 1. Generate cryptographic signature & QR
    const signatureResult = await this.signatureEngine.generateSignature({
      institutionId: input.institution.id,
      documentType: 'certificate',
      recipientId: input.recipient.id,
      serialNumber,
      issuedAt,
      customData: {
        certificateType: input.certificateType,
        recipientName: input.recipient.name,
        rollNumber: input.recipient.rollNumber,
      },
    });

    // 2. Prepare Template Context
    const context = {
      institution: {
        name: input.institution.name,
        address: input.institution.address || 'Campus Road, Education District',
        city: input.institution.city || 'Trivandrum',
        affiliationCode: input.institution.affiliationCode || 'THAIBA-AFFIL',
      },
      serialNumber,
      academicYear: input.academicYear,
      student: {
        name: input.recipient.name,
        guardianName: input.recipient.guardianName || 'Parent / Guardian',
        rollNumber: input.recipient.rollNumber,
        className: input.recipient.className,
        characterRating: input.recipient.characterRating || 'EXCELLENT',
      },
      purpose: input.recipient.purpose || 'Official Verification & Record',
      issuedAt,
      qrCodeSvg: signatureResult.qrCodeSvg,
      shortHash: signatureResult.shortHash,
      signatoryTitle: input.signatoryTitle || 'Principal / Head of Institution',
    };

    // 3. Render HTML
    const renderRes = await this.templateEngine.render(templateCode, context, input.institution.id);

    // 4. Persist in Store
    const recordId = `rec_cert_${signatureResult.shortHash}_${Date.now()}`;
    const recordItem: DocGeneratedRecordItem = {
      id: recordId,
      institutionId: input.institution.id,
      documentType: 'certificate',
      recipientType: 'student',
      recipientId: input.recipient.id,
      documentHash: signatureResult.documentHash,
      serialNumber,
      title: `${input.certificateType.toUpperCase()} Certificate - ${input.recipient.name}`,
      status: 'valid',
      fileSizeBytes: Buffer.byteLength(renderRes.html, 'utf8'),
      metadataJson: JSON.stringify({
        certificateType: input.certificateType,
        purpose: input.recipient.purpose,
      }),
      generatedById: input.generatedByUserId,
      issuedAt,
      createdAt: issuedAt,
      updatedAt: issuedAt,
    };

    await this.store.createGeneratedRecord(recordItem);
    await this.store.createVerificationSignature({
      id: `sig_${recordId}`,
      documentRecordId: recordId,
      documentHash: signatureResult.documentHash,
      signature: signatureResult.signature,
      signingAlgorithm: signatureResult.signingAlgorithm,
      verificationCount: 0,
      revoked: false,
      createdAt: issuedAt,
    });

    return {
      recordId,
      serialNumber,
      documentHash: signatureResult.documentHash,
      shortHash: signatureResult.shortHash,
      verificationUrl: signatureResult.verificationUrl,
      renderedHtml: renderRes.html,
      certificateType: input.certificateType,
      issuedAt,
    };
  }
}
