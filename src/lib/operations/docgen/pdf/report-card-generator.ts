import { GradeCalculatorBridge, SubjectScoreInput } from './grade-calculator-bridge';
import { TemplateEngine } from '../templates/template-engine';
import { DocumentSignatureEngine } from '../crypto/document-signature-engine';
import { DocDbStore } from '../../../db/docgen-store';
import { DocGeneratedRecordItem } from '../docgen-types';

export interface StudentReportCardInput {
  institution: {
    id: string;
    name: string;
    address?: string;
    affiliationCode?: string;
    city?: string;
  };
  academicYear: string;
  termName: string;
  student: {
    id: string;
    name: string;
    rollNumber: string;
    className: string;
    guardianName?: string;
    dob?: string;
    attendancePercent?: number;
    presentDays?: number;
    totalDays?: number;
  };
  subjects: SubjectScoreInput[];
  teacherRemarks?: string;
  templateCode?: string;
  generatedByUserId?: string;
}

export interface GeneratedReportCardResult {
  recordId: string;
  serialNumber: string;
  documentHash: string;
  shortHash: string;
  verificationUrl: string;
  renderedHtml: string;
  summary: ReturnType<typeof GradeCalculatorBridge.computeSummary>;
  issuedAt: string;
}

export class ReportCardGenerator {
  private static instance: ReportCardGenerator;
  private templateEngine: TemplateEngine;
  private signatureEngine: DocumentSignatureEngine;
  private store: DocDbStore;

  private constructor() {
    this.templateEngine = TemplateEngine.getInstance();
    this.signatureEngine = DocumentSignatureEngine.getInstance();
    this.store = DocDbStore.getInstance();
  }

  public static getInstance(): ReportCardGenerator {
    if (!ReportCardGenerator.instance) {
      ReportCardGenerator.instance = new ReportCardGenerator();
    }
    return ReportCardGenerator.instance;
  }

  public async generateReportCard(input: StudentReportCardInput): Promise<GeneratedReportCardResult> {
    const templateCode = input.templateCode || 'STD_REPORT_CARD_V1';
    const summary = GradeCalculatorBridge.computeSummary(input.subjects);
    const issuedAt = new Date().toISOString();
    const serialNumber = `TH/RC/${input.academicYear.replace(/[^a-zA-Z0-9]/g, '')}/${input.student.rollNumber.replace(/[^a-zA-Z0-9]/g, '')}`;

    // 1. Generate cryptographic signature & QR
    const signatureResult = await this.signatureEngine.generateSignature({
      institutionId: input.institution.id,
      documentType: 'report_card',
      recipientId: input.student.id,
      serialNumber,
      issuedAt,
      customData: {
        totalMarks: summary.totalMarksObtained,
        gpa: summary.gpa,
        result: summary.resultStatus,
      },
    });

    // 2. Prepare Context for Template Rendering
    const context = {
      institution: {
        name: input.institution.name,
        address: input.institution.address || 'Academic Main Campus',
        affiliationCode: input.institution.affiliationCode || 'THAIBA-ACADEMIC',
      },
      academicYear: input.academicYear,
      termName: input.termName,
      student: {
        ...input.student,
        guardianName: input.student.guardianName || 'Guardian',
        dob: input.student.dob || 'N/A',
        attendancePercent: input.student.attendancePercent ?? 100,
        presentDays: input.student.presentDays ?? 90,
        totalDays: input.student.totalDays ?? 90,
      },
      marks: summary.computedSubjects,
      totalMarksObtained: summary.totalMarksObtained,
      totalMaxMarks: summary.totalMaxMarks,
      percentage: summary.percentage,
      gpa: summary.gpa,
      resultStatus: summary.resultStatus,
      teacherRemarks: input.teacherRemarks || 'Satisfactory academic performance.',
      qrCodeSvg: signatureResult.qrCodeSvg,
      shortHash: signatureResult.shortHash,
      serialNumber,
      issuedAt,
    };

    // 3. Render HTML
    const renderRes = await this.templateEngine.render(templateCode, context, input.institution.id);

    // 4. Persist in Store
    const recordId = `rec_${signatureResult.shortHash}_${Date.now()}`;
    const recordItem: DocGeneratedRecordItem = {
      id: recordId,
      institutionId: input.institution.id,
      documentType: 'report_card',
      recipientType: 'student',
      recipientId: input.student.id,
      documentHash: signatureResult.documentHash,
      serialNumber,
      title: `${input.termName} Academic Report Card - ${input.student.name}`,
      status: 'valid',
      fileSizeBytes: Buffer.byteLength(renderRes.html, 'utf8'),
      metadataJson: JSON.stringify({
        gpa: summary.gpa,
        percentage: summary.percentage,
        resultStatus: summary.resultStatus,
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
      summary,
      issuedAt,
    };
  }
}
