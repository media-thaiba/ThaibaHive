import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { batchGenerateDocSchema } from '@/lib/validation/docgen-schemas';
import { ReportCardGenerator } from '@/lib/operations/docgen/pdf/report-card-generator';
import { HallTicketGenerator } from '@/lib/operations/docgen/pdf/hall-ticket-generator';

export const POST = requireAuth(async (request, session) => {
  try {
    const body = await request.json();
    const parsed = batchGenerateDocSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
    }

    const { candidates, documentType, institutionId, academicYear, termOrExamName } = parsed.data;
    const results = [];

    if (documentType === 'report_card') {
      const generator = ReportCardGenerator.getInstance();
      for (const c of candidates) {
        const res = await generator.generateReportCard({
          institution: { id: institutionId, name: 'Thaiba Academic Institution' },
          academicYear,
          termName: termOrExamName || 'Term 1',
          student: {
            id: c.recipientId,
            name: c.recipientName,
            rollNumber: c.rollNumber,
            className: c.className || 'General',
          },
          subjects: c.subjects || [{ subjectName: 'General Subject', maxMarks: 100, marksObtained: 80 }],
          generatedByUserId: session.staffId,
        });
        results.push(res);
      }
    } else if (documentType === 'hall_ticket') {
      const generator = HallTicketGenerator.getInstance();
      for (const c of candidates) {
        const res = await generator.generateHallTicket({
          institution: { id: institutionId, name: 'Thaiba Academic Institution' },
          exam: {
            id: termOrExamName || 'exam-current',
            name: termOrExamName || 'Annual Examination',
            session: academicYear,
            centerName: 'Main Exam Hall',
            hallNumber: 'H1',
            seatNumber: 'S1',
          },
          student: {
            id: c.recipientId,
            name: c.recipientName,
            rollNumber: c.rollNumber,
            registrationNumber: `REG-${c.rollNumber}`,
            courseName: c.className || 'General',
          },
          schedule: c.examSchedule || [{ date: '2026-09-10', time: '10:00 AM', subjectCode: 'GEN', subjectTitle: 'Paper 1' }],
          generatedByUserId: session.staffId,
        });
        results.push(res);
      }
    }

    return NextResponse.json({
      success: true,
      batchCount: results.length,
      results,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Batch generation failed' }, { status: 500 });
  }
}, 'documents:generate');
