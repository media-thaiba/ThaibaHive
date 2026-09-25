import { SeatingAllocationBridge, ExamScheduleItemInput } from './seating-allocation-bridge';
import { TemplateEngine } from '../templates/template-engine';
import { DocumentSignatureEngine } from '../crypto/document-signature-engine';
import { DocDbStore } from '../../../db/docgen-store';
import { DocGeneratedRecordItem } from '../docgen-types';

export interface HallTicketCandidateInput {
  institution: {
    id: string;
    name: string;
    address?: string;
  };
  exam: {
    id: string;
    name: string;
    session: string;
    centerName: string;
    hallNumber: string;
    seatNumber: string;
  };
  student: {
    id: string;
    name: string;
    rollNumber: string;
    registrationNumber: string;
    courseName: string;
    photoUrl?: string;
  };
  schedule: ExamScheduleItemInput[];
  templateCode?: string;
  generatedByUserId?: string;
}

export interface GeneratedHallTicketResult {
  recordId: string;
  serialNumber: string;
  documentHash: string;
  shortHash: string;
  verificationUrl: string;
  renderedHtml: string;
  issuedAt: string;
}

export class HallTicketGenerator {
  private static instance: HallTicketGenerator;
  private templateEngine: TemplateEngine;
  private signatureEngine: DocumentSignatureEngine;
  private store: DocDbStore;

  private constructor() {
    this.templateEngine = TemplateEngine.getInstance();
    this.signatureEngine = DocumentSignatureEngine.getInstance();
    this.store = DocDbStore.getInstance();
  }

  public static getInstance(): HallTicketGenerator {
    if (!HallTicketGenerator.instance) {
      HallTicketGenerator.instance = new HallTicketGenerator();
    }
    return HallTicketGenerator.instance;
  }

  public async generateHallTicket(input: HallTicketCandidateInput): Promise<GeneratedHallTicketResult> {
    const templateCode = input.templateCode || 'STD_HALL_TICKET_V1';
    const seating = SeatingAllocationBridge.processSeating(
      input.exam.centerName,
      input.exam.hallNumber,
      input.exam.seatNumber,
      input.exam.session,
      input.schedule
    );

    const issuedAt = new Date().toISOString();
    const serialNumber = `TH/HT/${input.exam.id.replace(/[^a-zA-Z0-9]/g, '')}/${input.student.rollNumber.replace(/[^a-zA-Z0-9]/g, '')}`;

    // 1. Generate cryptographic signature & QR
    const signatureResult = await this.signatureEngine.generateSignature({
      institutionId: input.institution.id,
      documentType: 'hall_ticket',
      recipientId: input.student.id,
      serialNumber,
      issuedAt,
      customData: {
        examId: input.exam.id,
        seatNumber: input.exam.seatNumber,
        rollNumber: input.student.rollNumber,
      },
    });

    // 2. Prepare Context for Template Rendering
    const context = {
      institution: {
        name: input.institution.name,
      },
      exam: {
        name: input.exam.name,
        session: input.exam.session,
        centerName: seating.examCenterName,
        hallNumber: seating.hallNumber,
        seatNumber: seating.seatNumber,
      },
      student: {
        name: input.student.name,
        rollNumber: input.student.rollNumber,
        registrationNumber: input.student.registrationNumber,
        courseName: input.student.courseName,
        photoUrl: input.student.photoUrl,
      },
      schedule: seating.sortedSchedule,
      qrCodeSvg: signatureResult.qrCodeSvg,
      shortHash: signatureResult.shortHash,
      serialNumber,
      issuedAt,
    };

    // 3. Render HTML
    const renderRes = await this.templateEngine.render(templateCode, context, input.institution.id);

    // 4. Persist in Store
    const recordId = `rec_ht_${signatureResult.shortHash}_${Date.now()}`;
    const recordItem: DocGeneratedRecordItem = {
      id: recordId,
      institutionId: input.institution.id,
      documentType: 'hall_ticket',
      recipientType: 'student',
      recipientId: input.student.id,
      examId: input.exam.id,
      documentHash: signatureResult.documentHash,
      serialNumber,
      title: `Examination Hall Ticket - ${input.student.name} (${input.exam.name})`,
      status: 'valid',
      fileSizeBytes: Buffer.byteLength(renderRes.html, 'utf8'),
      metadataJson: JSON.stringify({
        examId: input.exam.id,
        seatNumber: input.exam.seatNumber,
        hallNumber: input.exam.hallNumber,
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
      issuedAt,
    };
  }

  public async generateBatchHallTickets(
    candidates: HallTicketCandidateInput[]
  ): Promise<GeneratedHallTicketResult[]> {
    const results: GeneratedHallTicketResult[] = [];
    for (const candidate of candidates) {
      const res = await this.generateHallTicket(candidate);
      results.push(res);
    }
    return results;
  }
}
