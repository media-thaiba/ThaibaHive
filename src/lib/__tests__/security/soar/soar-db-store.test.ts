import { soarDbStore } from '@/lib/security/soar/soar-db-store';
import { SecurityPlaybook, SoarExecutionContext, SoarApprovalItem } from '@/lib/security/soar/soar-types';

describe('SoarDbStore', () => {
  it('should save and list playbooks without throwing', async () => {
    const mockPlaybook: SecurityPlaybook = {
      id: 'pb-db-test',
      name: 'DB_TEST_PLAYBOOK',
      version: '1.0.0',
      category: 'NETWORK',
      enabled: true,
      auto_execute: true,
      min_confidence: 80,
      triggers: [{ event_type: 'DB_TEST_EVENT' }],
      steps: [{ id: 's1', name: 'Step 1', action: 'quarantine_ip' }],
    };

    await expect(soarDbStore.savePlaybook(mockPlaybook)).resolves.not.toThrow();
    const playbooks = await soarDbStore.listPlaybooks();
    expect(Array.isArray(playbooks)).toBe(true);
  });

  it('should save execution logs without throwing', async () => {
    const mockContext: SoarExecutionContext = {
      execution_id: 'exec-db-123',
      playbook_id: 'pb-db-test',
      playbook_name: 'DB Test',
      trigger_payload: { threat: 'botnet' },
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
          input_params: {},
          output: { ok: true },
        },
      },
      started_at: new Date().toISOString(),
    };

    await expect(soarDbStore.saveExecution(mockContext)).resolves.not.toThrow();
  });

  it('should save approval items without throwing', async () => {
    const mockApproval: SoarApprovalItem = {
      id: 'appr_db_test_1',
      execution_id: 'exec-db-123',
      playbook_id: 'pb-db-test',
      playbook_name: 'DB Test',
      target_entity: { type: 'IP', value: '1.2.3.4' },
      confidence_score: 75,
      trigger_payload: {},
      status: 'PENDING',
      requested_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    };

    await expect(soarDbStore.saveApproval(mockApproval)).resolves.not.toThrow();
  });
});
