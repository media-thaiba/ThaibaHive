import { SoarAuditLogger } from '@/lib/security/soar/soar-audit-events';
import { SoarExecutionContext, SoarApprovalItem } from '@/lib/security/soar/soar-types';

describe('SoarAuditLogger', () => {
  const mockContext: SoarExecutionContext = {
    execution_id: 'exec-audit-101',
    playbook_id: 'pb-audit-1',
    playbook_name: 'Audit Test Playbook',
    trigger_payload: { ip: '1.2.3.4' },
    target_entity: { type: 'IP', value: '1.2.3.4' },
    state: 'COMPLETED',
    step_order: ['s1'],
    steps: {
      s1: {
        step_id: 's1',
        name: 'Step 1',
        action: 'quarantine_ip',
        state: 'COMPLETED',
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        input_params: {},
        output: { quarantined: true },
      },
    },
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
  };

  it('should log playbook trigger to Merkle audit writer without throwing', async () => {
    await expect(SoarAuditLogger.logPlaybookTriggered(mockContext)).resolves.not.toThrow();
  });

  it('should log step execution and playbook completion without throwing', async () => {
    await expect(SoarAuditLogger.logStepExecuted(mockContext, mockContext.steps['s1'])).resolves.not.toThrow();
    await expect(SoarAuditLogger.logPlaybookFinished(mockContext)).resolves.not.toThrow();
  });

  it('should log approval events without throwing', async () => {
    const mockApproval: SoarApprovalItem = {
      id: 'appr-audit-1',
      execution_id: 'exec-audit-101',
      playbook_id: 'pb-audit-1',
      playbook_name: 'Audit Test',
      target_entity: { type: 'IP', value: '1.2.3.4' },
      confidence_score: 75,
      trigger_payload: {},
      status: 'APPROVED',
      requested_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    };

    await expect(SoarAuditLogger.logApproval(mockApproval, 'RESOLVED')).resolves.not.toThrow();
  });
});
