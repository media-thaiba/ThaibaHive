import { TemplateEngine } from '../../../operations/engage/template-engine';

describe('EngageOS TemplateEngine Tests', () => {
  let engine: TemplateEngine;

  beforeEach(() => {
    engine = TemplateEngine.getInstance();
  });

  it('should interpolate nested variables correctly', () => {
    const tmpl = 'Hello {{student.name}}, your tuition balance is ${{account.balance}}.';
    const result = engine.render(tmpl, {
      student: { name: 'Amina' },
      account: { balance: 450 },
    });
    expect(result).toBe('Hello Amina, your tuition balance is $450.');
  });

  it('should evaluate conditional blocks correctly', () => {
    const tmpl = 'Dear {{name}}, {{#if isPassing}}congratulations on passing!{{else}}please contact your tutor.{{/if}}';
    const passResult = engine.render(tmpl, { name: 'Zaid', isPassing: true });
    expect(passResult).toBe('Dear Zaid, congratulations on passing!');

    const failResult = engine.render(tmpl, { name: 'Zaid', isPassing: false });
    expect(failResult).toBe('Dear Zaid, please contact your tutor.');
  });

  it('should render loop collections cleanly', () => {
    const tmpl = 'Upcoming Exams: {{#each exams}}[{{this.course}}: {{this.date}}] {{/each}}';
    const result = engine.render(tmpl, {
      exams: [
        { course: 'CS101', date: 'Oct 12' },
        { course: 'MATH201', date: 'Oct 15' },
      ],
    });
    expect(result).toBe('Upcoming Exams: [CS101: Oct 12] [MATH201: Oct 15] ');
  });

  it('should sanitize executable script tags for XSS protection', () => {
    const tmpl = 'Welcome {{name}}<script>alert("hack")</script>';
    const result = engine.render(tmpl, { name: 'Tariq' });
    expect(result).not.toContain('<script>');
    expect(result).toBe('Welcome Tariq');
  });
});
