import { GradeCalculatorBridge } from '../../../operations/docgen/pdf/grade-calculator-bridge';
import { ReportCardGenerator } from '../../../operations/docgen/pdf/report-card-generator';
import { DocDbStore } from '../../../db/docgen-store';

describe('ReportCardGenerator & GradeCalculatorBridge (Sprint-056)', () => {
  beforeEach(() => {
    DocDbStore.getInstance().clearMemoryStore();
  });

  describe('GradeCalculatorBridge', () => {
    it('should compute weighted GPA and distinction classification', () => {
      const subjects = [
        { subjectName: 'Algorithms', maxMarks: 100, marksObtained: 92, credits: 4 },
        { subjectName: 'Database Systems', maxMarks: 100, marksObtained: 84, credits: 3 },
        { subjectName: 'Software Engineering', maxMarks: 100, marksObtained: 88, credits: 3 },
      ];

      const summary = GradeCalculatorBridge.computeSummary(subjects);
      expect(summary.totalMarksObtained).toBe(264);
      expect(summary.totalMaxMarks).toBe(300);
      expect(summary.percentage).toBe(88.0);
      expect(summary.resultStatus).toBe('DISTINCTION');
      expect(summary.hasFailedSubject).toBe(false);
      expect(summary.gpa).toBeGreaterThanOrEqual(3.7);
    });

    it('should correctly flag failed subjects and calculate failing result status', () => {
      const subjects = [
        { subjectName: 'Advanced Calculus', maxMarks: 100, marksObtained: 32, credits: 4 },
        { subjectName: 'Physics Lab', maxMarks: 100, marksObtained: 80, credits: 2 },
      ];

      const summary = GradeCalculatorBridge.computeSummary(subjects);
      expect(summary.hasFailedSubject).toBe(true);
      expect(summary.resultStatus).toBe('FAILED');
    });
  });

  describe('ReportCardGenerator', () => {
    it('should generate, sign, and store official report card records', async () => {
      const generator = ReportCardGenerator.getInstance();
      const result = await generator.generateReportCard({
        institution: {
          id: 'inst-tgcis',
          name: 'Thaiba Garden College of Integrated Studies',
          address: 'Venjaramoodu, Trivandrum',
        },
        academicYear: '2025-2026',
        termName: 'Semester 2',
        student: {
          id: 'stu-501',
          name: 'Fathima Nasrin',
          rollNumber: 'TGCIS-2026-CS-01',
          className: 'B.Sc Computer Science',
        },
        subjects: [
          { subjectName: 'Web Technologies', maxMarks: 100, marksObtained: 95 },
          { subjectName: 'Discrete Mathematics', maxMarks: 100, marksObtained: 85 },
        ],
        teacherRemarks: 'Exemplary performance across all course milestones.',
      });

      expect(result.recordId).toBeDefined();
      expect(result.serialNumber).toContain('TGCIS2026CS01');
      expect(result.documentHash).toBeDefined();
      expect(result.renderedHtml).toContain('Thaiba Garden College of Integrated Studies');
      expect(result.renderedHtml).toContain('Fathima Nasrin');
      expect(result.renderedHtml).toContain('DISTINCTION');

      // Verify that record was stored in DocDbStore
      const storedRec = await DocDbStore.getInstance().getGeneratedRecordByHash(result.documentHash);
      expect(storedRec).toBeDefined();
      expect(storedRec?.title).toContain('Fathima Nasrin');
    });
  });
});
