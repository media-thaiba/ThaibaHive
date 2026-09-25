import { TokenEvaluator } from '../../../operations/docgen/templates/token-evaluator';
import { TemplateEngine } from '../../../operations/docgen/templates/template-engine';

describe('DOC-GEN Template Engine & Token Evaluator (Sprint-056)', () => {
  describe('TokenEvaluator', () => {
    const evaluator = new TokenEvaluator();

    it('should interpolate simple and nested properties with HTML escaping', () => {
      const template = 'Hello, {{student.name}}! Roll: {{student.rollNumber}} & {{{rawHtml}}}';
      const context = {
        student: { name: 'Ameen & Brother', rollNumber: 104 },
        rawHtml: '<b>Bold Text</b>',
      };

      const output = evaluator.evaluate(template, context);
      expect(output).toContain('Ameen &amp; Brother');
      expect(output).toContain('Roll: 104');
      expect(output).toContain('<b>Bold Text</b>');
    });

    it('should format helpers correctly (currency, date, percent, uppercase)', () => {
      const template = 'Fee: {{formatCurrency feeAmount}}, Due: {{formatDate dueDate}}, Pass: {{formatPercent passRate}}, Dept: {{uppercase dept}}';
      const context = {
        feeAmount: 1500,
        dueDate: '2026-09-15T00:00:00Z',
        passRate: 98.75,
        dept: 'computer science',
      };

      const output = evaluator.evaluate(template, context);
      expect(output).toContain('$1,500.00');
      expect(output).toContain('98.8%');
      expect(output).toContain('COMPUTER SCIENCE');
    });

    it('should evaluate conditional if/else blocks', () => {
      const template = '{{#if isPassed}}Status: PASSED{{else}}Status: FAILED{{/if}}';
      expect(evaluator.evaluate(template, { isPassed: true })).toBe('Status: PASSED');
      expect(evaluator.evaluate(template, { isPassed: false })).toBe('Status: FAILED');
    });

    it('should evaluate loop iterations with #each', () => {
      const template = '<ul>{{#each subjects}}<li>{{@index}}: {{this.name}} - {{this.score}}</li>{{/each}}</ul>';
      const context = {
        subjects: [
          { name: 'Mathematics', score: 95 },
          { name: 'Physics', score: 88 },
        ],
      };

      const output = evaluator.evaluate(template, context);
      expect(output).toContain('<li>0: Mathematics - 95</li>');
      expect(output).toContain('<li>1: Physics - 88</li>');
    });
  });

  describe('TemplateEngine', () => {
    const engine = TemplateEngine.getInstance();

    it('should render built-in report card template successfully', async () => {
      const context = {
        institution: {
          name: 'Thaiba Garden College of Integrated Studies',
          address: 'Venjaramoodu, Trivandrum',
          affiliationCode: 'TGCIS-2026-UNIV',
        },
        academicYear: '2025-2026',
        termName: 'Semester 1',
        student: {
          name: 'Muhammed Bilal',
          rollNumber: 'TGCIS/2026/CS/042',
          className: 'B.Sc Computer Science',
          guardianName: 'Abdul Rahman',
          dob: '2005-04-12',
          attendancePercent: 96.5,
          presentDays: 85,
          totalDays: 88,
        },
        marks: [
          { subjectName: 'Data Structures', maxMarks: 100, marksObtained: 92, gradeLetter: 'A+', remarks: 'Excellent' },
          { subjectName: 'Operating Systems', maxMarks: 100, marksObtained: 88, gradeLetter: 'A', remarks: 'Very Good' },
        ],
        totalMarksObtained: 180,
        totalMaxMarks: 200,
        percentage: '90.0',
        gpa: '3.90',
        resultStatus: 'DISTINCTION',
        teacherRemarks: 'Outstanding analytical and coding skills shown across all labs.',
        qrCodeSvg: '<svg>mock-qr</svg>',
        shortHash: '8f92a1b0',
      };

      const res = await engine.render('STD_REPORT_CARD_V1', context);
      expect(res.html).toContain('Thaiba Garden College of Integrated Studies');
      expect(res.html).toContain('Muhammed Bilal');
      expect(res.html).toContain('Data Structures');
      expect(res.html).toContain('DISTINCTION');
      expect(res.pageSize).toBe('A4');
    });

    it('should render built-in hall ticket template', async () => {
      const context = {
        institution: { name: 'Thaiba Higher Secondary School' },
        exam: { name: 'Annual Board Exam', session: 'March 2026', centerName: 'Main Campus Hall A', hallNumber: 'H-02', seatNumber: '44' },
        student: { name: 'Fatima Zahra', rollNumber: 'THSS-8902', registrationNumber: 'REG-2026-99', courseName: 'Science (PCMB)' },
        schedule: [
          { date: '2026-03-10', time: '10:00 AM - 01:00 PM', subjectCode: 'PHY101', subjectTitle: 'Physics Theory' },
        ],
        qrCodeSvg: '<svg>qr</svg>',
      };

      const res = await engine.render('STD_HALL_TICKET_V1', context);
      expect(res.html).toContain('Fatima Zahra');
      expect(res.html).toContain('Physics Theory');
      expect(res.html).toContain('THSS-8902');
    });
  });
});
