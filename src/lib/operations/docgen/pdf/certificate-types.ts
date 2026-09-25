import { CertificateType } from '../docgen-types';

export interface CertificateRecipientInput {
  id: string;
  name: string;
  guardianName?: string;
  rollNumber: string;
  className: string;
  admissionDate?: string;
  completionDate?: string;
  characterRating?: 'EXCELLENT' | 'VERY_GOOD' | 'GOOD' | 'SATISFACTORY';
  achievementTitle?: string;
  purpose?: string;
}

export interface AcademicCertificateInput {
  institution: {
    id: string;
    name: string;
    address?: string;
    city?: string;
    affiliationCode?: string;
  };
  certificateType: CertificateType;
  academicYear: string;
  recipient: CertificateRecipientInput;
  signatoryTitle?: string;
  issuedAt?: string;
  templateCode?: string;
  generatedByUserId?: string;
}

export interface GeneratedCertificateResult {
  recordId: string;
  serialNumber: string;
  documentHash: string;
  shortHash: string;
  verificationUrl: string;
  renderedHtml: string;
  certificateType: CertificateType;
  issuedAt: string;
}
