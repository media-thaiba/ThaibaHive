import { CANONICAL_SECURITY_PLAYBOOKS } from '@/lib/security/soar/playbooks/definitions';
import { PlaybookValidator } from '@/lib/security/soar/playbook-validator';

describe('Canonical Security Playbooks Library', () => {
  it('should include exactly 10 pre-configured canonical playbooks', () => {
    expect(CANONICAL_SECURITY_PLAYBOOKS).toHaveLength(10);
  });

  it('should validate all 10 canonical playbooks with 0 validation errors', () => {
    for (const playbook of CANONICAL_SECURITY_PLAYBOOKS) {
      const result = PlaybookValidator.validate(playbook);
      expect(result.errors).toEqual([]);
      expect(result.valid).toBe(true);
    }
  });

  it('should have unique IDs across all canonical playbooks', () => {
    const ids = CANONICAL_SECURITY_PLAYBOOKS.map(p => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(CANONICAL_SECURITY_PLAYBOOKS.length);
  });

  it('should define triggers and steps for every canonical playbook', () => {
    for (const playbook of CANONICAL_SECURITY_PLAYBOOKS) {
      expect(playbook.triggers.length).toBeGreaterThan(0);
      expect(playbook.steps.length).toBeGreaterThan(0);
      expect(playbook.min_confidence).toBeGreaterThanOrEqual(0);
      expect(playbook.min_confidence).toBeLessThanOrEqual(100);
    }
  });
});
