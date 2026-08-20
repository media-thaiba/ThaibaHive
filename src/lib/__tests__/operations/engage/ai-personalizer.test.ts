import { AiPersonalizer } from '../../../operations/engage/ai-personalizer';

describe('EngageOS AiPersonalizer Tests', () => {
  let personalizer: AiPersonalizer;

  beforeEach(() => {
    personalizer = AiPersonalizer.getInstance();
  });

  it('should synthesize personalized attendance remediation notice for parent', () => {
    const result = personalizer.personalizeMessage(
      'Mid-Semester Academic Progress',
      'The semester midterm reports are now available in the portal.',
      {
        recipientId: 'parent_1',
        recipientType: 'parent',
        name: 'Bilal',
        attendancePct: 68.5,
        outstandingBalanceUsd: 250,
      }
    );

    expect(result.personalizedSubject).toContain('[Important Update]');
    expect(result.personalizedBody).toContain('attendance is currently at 68.5%');
    expect(result.personalizedBody).toContain('outstanding balance of $250.00');
    expect(result.recommendedAction).toContain('counselor consultation');
    expect(result.toneApplied).toBe('formal');
  });

  it('should add encouraging advice for students with low attendance', () => {
    const result = personalizer.personalizeMessage(
      'Weekly Schedule',
      'Here are your classes for the coming week.',
      {
        recipientId: 'student_1',
        recipientType: 'student',
        name: 'Fatima',
        attendancePct: 72.0,
      }
    );

    expect(result.personalizedBody).toContain('restore your attendance');
    expect(result.toneApplied).toBe('encouraging');
  });
});
