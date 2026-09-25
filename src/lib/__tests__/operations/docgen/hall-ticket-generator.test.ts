import { HallTicketGenerator } from '../../../operations/docgen/pdf/hall-ticket-generator';
import { DocDbStore } from '../../../db/docgen-store';

describe('HallTicketGenerator & Seating Allocation (Sprint-056)', () => {
  beforeEach(() => {
    DocDbStore.getInstance().clearMemoryStore();
  });

  it('should generate an official QR hall ticket and store cryptographic signature', async () => {
    const generator = HallTicketGenerator.getInstance();
    const result = await generator.generateHallTicket({
      institution: {
        id: 'inst-001',
        name: 'Thaiba Higher Secondary School',
      },
      exam: {
        id: 'exam-2026-term1',
        name: 'First Terminal Examination 2026',
        session: 'September 2026',
        centerName: 'Block B Examination Hall',
        hallNumber: 'Hall 102',
        seatNumber: 'B-14',
      },
      student: {
        id: 'stu-991',
        name: 'Zayd Al-Mansoor',
        rollNumber: 'THSS-2026-991',
        registrationNumber: 'REG-99182',
        courseName: 'Higher Secondary Commerce',
      },
      schedule: [
        { date: '2026-09-12', time: '09:30 AM - 12:30 PM', subjectCode: 'ACC201', subjectTitle: 'Accountancy' },
        { date: '2026-09-10', time: '09:30 AM - 12:30 PM', subjectCode: 'ENG101', subjectTitle: 'English Core' },
      ],
    });

    expect(result.recordId).toBeDefined();
    expect(result.serialNumber).toContain('THSS2026991');
    expect(result.documentHash).toBeDefined();
    expect(result.renderedHtml).toContain('Thaiba Higher Secondary School');
    expect(result.renderedHtml).toContain('Zayd Al-Mansoor');
    expect(result.renderedHtml).toContain('Accountancy');
    expect(result.renderedHtml).toContain('English Core');

    const storedRec = await DocDbStore.getInstance().getGeneratedRecordByHash(result.documentHash);
    expect(storedRec).toBeDefined();
    expect(storedRec?.documentType).toBe('hall_ticket');
  });

  it('should generate batch hall tickets for multiple students', async () => {
    const generator = HallTicketGenerator.getInstance();
    const candidates = [
      {
        institution: { id: 'inst-001', name: 'Thaiba Academy' },
        exam: { id: 'ex-1', name: 'Midterm', session: '2026', centerName: 'Center A', hallNumber: 'H1', seatNumber: 'S1' },
        student: { id: 's-1', name: 'Student 1', rollNumber: 'R-01', registrationNumber: 'REG-1', courseName: 'Science' },
        schedule: [{ date: '2026-09-10', time: '10:00 AM', subjectCode: 'MTH', subjectTitle: 'Maths' }],
      },
      {
        institution: { id: 'inst-001', name: 'Thaiba Academy' },
        exam: { id: 'ex-1', name: 'Midterm', session: '2026', centerName: 'Center A', hallNumber: 'H1', seatNumber: 'S2' },
        student: { id: 's-2', name: 'Student 2', rollNumber: 'R-02', registrationNumber: 'REG-2', courseName: 'Science' },
        schedule: [{ date: '2026-09-10', time: '10:00 AM', subjectCode: 'MTH', subjectTitle: 'Maths' }],
      },
    ];

    const batchResults = await generator.generateBatchHallTickets(candidates);
    expect(batchResults).toHaveLength(2);
    expect(batchResults[0].renderedHtml).toContain('Student 1');
    expect(batchResults[1].renderedHtml).toContain('Student 2');
  });
});
