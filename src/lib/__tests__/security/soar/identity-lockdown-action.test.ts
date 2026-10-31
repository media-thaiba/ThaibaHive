import { identityLockdownAction } from '@/lib/security/soar/actions/identity-lockdown-action';
import { db } from '@/db';
import { SoarExecutionContext } from '@/lib/security/soar/soar-types';

jest.mock('@/db', () => {
  return {
    db: {
      transaction: jest.fn().mockImplementation(async (callback) => {
        const tx = {
          update: jest.fn().mockReturnValue({
            set: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                run: jest.fn(),
              }),
            }),
          }),
        };
        return callback(tx);
      }),
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            run: jest.fn(),
          }),
        }),
      }),
    },
  };
});

describe('IdentityLockdownAction', () => {
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

  it('should lock user account and terminate sessions in db.transaction', async () => {
    const output = await identityLockdownAction.execute({ user_id: 'usr_suspicious_99' }, mockContext);

    expect(output.locked).toBe(true);
    expect(output.user_id).toBe('usr_suspicious_99');
    expect(db.transaction).toHaveBeenCalled();
  });

  it('should restore isActive on compensation', async () => {
    const output = await identityLockdownAction.execute({ user_id: 'usr_suspicious_99' }, mockContext);
    await identityLockdownAction.compensate!({ user_id: 'usr_suspicious_99' }, output, mockContext);
    expect(db.update).toHaveBeenCalled();
  });
});
