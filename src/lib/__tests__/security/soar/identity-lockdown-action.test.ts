import { identityLockdownAction } from '@/lib/security/soar/actions/identity-lockdown-action';
import { revocationStore } from '@/lib/identity/revocation-store';
import { SoarExecutionContext } from '@/lib/security/soar/soar-types';

describe('IdentityLockdownAction', () => {
  beforeEach(() => {
    revocationStore._reset();
  });

  const mockContext: SoarExecutionContext = {
    execution_id: 'exec-id-lockdown',
    playbook_id: 'pb-account-lockdown',
    playbook_name: 'Account Lockdown Playbook',
    trigger_payload: {},
    target_entity: { type: 'USER', value: 'usr_suspicious_99' },
    state: 'RUNNING',
    step_order: [],
    steps: {},
    started_at: new Date().toISOString(),
  };

  it('should lock user account and revoke access', async () => {
    const output = await identityLockdownAction.execute({ user_id: 'usr_suspicious_99' }, mockContext);

    expect(output.locked).toBe(true);
    expect(output.user_id).toBe('usr_suspicious_99');
    expect(revocationStore.isUserRevoked('usr_suspicious_99')).toBe(true);
  });

  it('should unrevoke user on compensation', async () => {
    const output = await identityLockdownAction.execute({ user_id: 'usr_suspicious_99' }, mockContext);
    expect(revocationStore.isUserRevoked('usr_suspicious_99')).toBe(true);

    await identityLockdownAction.compensate!({ user_id: 'usr_suspicious_99' }, output, mockContext);
    expect(revocationStore.isUserRevoked('usr_suspicious_99')).toBe(false);
  });
});
