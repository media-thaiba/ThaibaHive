import { PlaybookValidator } from '@/lib/security/soar/playbook-validator';
import { SecurityPlaybook } from '@/lib/security/soar/soar-types';

describe('PlaybookValidator', () => {
  it('should pass validation on valid playbook', () => {
    const validPlaybook: SecurityPlaybook = {
      id: 'pb-valid',
      name: 'VALID_PLAYBOOK',
      version: '1.0.0',
      category: 'NETWORK',
      enabled: true,
      auto_execute: true,
      min_confidence: 80,
      triggers: [{ event_type: 'THREAT_DETECTED' }],
      steps: [{ id: 'step_1', name: 'Step 1', action: 'quarantine_ip' }],
    };

    const result = PlaybookValidator.validate(validPlaybook);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect duplicate step IDs in a playbook', () => {
    const duplicateStepPlaybook: SecurityPlaybook = {
      id: 'pb-dup',
      name: 'DUPLICATE_STEPS',
      version: '1.0.0',
      category: 'NETWORK',
      enabled: true,
      auto_execute: true,
      min_confidence: 80,
      triggers: [{ event_type: 'THREAT_DETECTED' }],
      steps: [
        { id: 'step_duplicate', name: 'Step 1', action: 'quarantine_ip' },
        { id: 'step_duplicate', name: 'Step 2', action: 'quarantine_ip' },
      ],
    };

    const result = PlaybookValidator.validate(duplicateStepPlaybook);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Duplicate step ID 'step_duplicate' detected in playbook");
  });

  it('should detect missing required fields in schema validation', () => {
    const incompletePlaybook: any = {
      name: 'INCOMPLETE',
      category: 'INVALID_CATEGORY',
    };

    const result = PlaybookValidator.validate(incompletePlaybook);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
