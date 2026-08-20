import { prerequisiteValidator } from '@/lib/operations/km/advising/prereq-validator';

describe('Prerequisite Chain Validator (KM-009)', () => {
  it('should validate prerequisite fulfillment correctly', () => {
    // CS-102 requires CS-101
    const failCheck = prerequisiteValidator.validatePrerequisites('CS-102', []);
    expect(failCheck.isSatisfied).toBe(false);
    expect(failCheck.missingPrerequisites).toContain('CS-101');

    const passCheck = prerequisiteValidator.validatePrerequisites('CS-102', ['CS-101']);
    expect(passCheck.isSatisfied).toBe(true);
    expect(passCheck.missingPrerequisites.length).toBe(0);
  });

  it('should allow waived prerequisites with audit record', () => {
    const waivedCheck = prerequisiteValidator.validatePrerequisites('CS-102', [], ['CS-101']);
    expect(waivedCheck.isSatisfied).toBe(true);
    expect(waivedCheck.waivedPrerequisites).toContain('CS-101');
  });
});
