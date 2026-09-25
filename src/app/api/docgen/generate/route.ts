import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { generateDocSchema } from '@/lib/validation/docgen-schemas';
import { ReportCardGenerator } from '@/lib/operations/docgen/pdf/report-card-generator';
import { HallTicketGenerator } from '@/lib/operations/docgen/pdf/hall-ticket-generator';
import { CertificateGenerator } from '@/lib/operations/docgen/pdf/certificate-generator';

export const POST = requireAuth(async (request, session) => {
  try {
    const body = await request.json();
    const parsed = generateDocSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
    }

    const { data } = parsed;

    if (data.documentType === 'report_card') {
      const generator = ReportCardGenerator.getInstance();
      const result = await generator.generateReportCard({
        institution: {
          id: data.institutionId,
          name: 'Thaiba Academic Institution',
        },
        academicYear: data.academicYear,
        termName: data.termOrExamName || 'Term Examination',
        student: {
          id: data.recipientId,
          name: data.recipientName,
          rollNumber: data.rollNumber,
          className: data.className || 'General Cohort',
        },
        subjects: data.subjects || [
          { subjectName: 'General Proficiency', maxMarks: 100, marksObtained: 85 },
        ],
        teacherRemarks: data.teacherRemarks,
        templateCode: data.templateCode,
        generatedByUserId: session.staffId,
      });
      return NextResponse.json({ success: true, result });
    }

    if (data.documentType === 'hall_ticket') {
      const generator = HallTicketGenerator.getInstance();
      const result = await generator.generateHallTicket({
        institution: {
          id: data.institutionId,
          name: 'Thaiba Academic Institution',
        },
        exam: {
          id: data.termOrExamName || 'exam-current',
          name: data.termOrExamName || 'Annual Examination',
          session: data.academicYear,
          centerName: 'Main Campus Examination Hall',
          hallNumber: 'Hall 1',
          seatNumber: 'Seat 10',
        },
        student: {
          id: data.recipientId,
          name: data.recipientName,
          rollNumber: data.rollNumber,
          registrationNumber: `REG-${data.rollNumber}`,
          courseName: data.className || 'General Course',
        },
        schedule: data.examSchedule || [
          { date: '2026-09-10', time: '10:00 AM - 01:00 PM', subjectCode: 'GEN101', subjectTitle: 'General Subject' },
        ],
        templateCode: data.templateCode,
        generatedByUserId: session.staffId,
      });
      return NextResponse.json({ success: true, result });
    }

    if (data.documentType === 'certificate') {
      const generator = CertificateGenerator.getInstance();
      const result = await generator.generateCertificate({
        institution: {
          id: data.institutionId,
          name: 'Thaiba Academic Institution',
        },
        certificateType: 'bonafide',
        academicYear: data.academicYear,
        recipient: {
          id: data.recipientId,
          name: data.recipientName,
          rollNumber: data.rollNumber,
          className: data.className || 'Standard',
          purpose: data.purpose || 'Official Institutional Record',
        },
        templateCode: data.templateCode,
        generatedByUserId: session.staffId,
      });
      return NextResponse.json({ success: true, result });
    }

    return NextResponse.json({ error: `Unsupported document type: ${data.documentType}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to generate document' }, { status: 500 });
  }
}, 'documents:generate');
