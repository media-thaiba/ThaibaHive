import {
  quarantineIpAction,
  containSubnetAction,
  revokeSessionAction,
  stepUpAuthAction,
  rateLimitThrottleAction,
  notificationAction,
  webhookDispatchAction,
  registerBuiltinActions,
} from '@/lib/security/soar/actions';
import { actionRegistry } from '@/lib/security/soar/action-registry';
import { SoarExecutionContext } from '@/lib/security/soar/soar-types';
import { QuarantineManager } from '@/lib/security/quarantine-manager';

describe('Built-in Security Action Handlers', () => {
  const mockContext: SoarExecutionContext = {
    execution_id: 'exec-action-test',
    playbook_id: 'pb-action-test',
    playbook_name: 'Action Test Playbook',
    trigger_payload: {},
    target_entity: { type: 'IP', value: '198.51.100.22' },
    state: 'RUNNING',
    step_order: [],
    steps: {},
    started_at: new Date().toISOString(),
  };

  beforeEach(() => {
    actionRegistry.clear();
    registerBuiltinActions();
  });

  it('should execute and compensate quarantine_ip action', async () => {
    const qm = QuarantineManager.getInstance();
    const output = await quarantineIpAction.execute({ ip: '198.51.100.22' }, mockContext);

    expect(output.quarantined).toBe(true);
    expect(output.ip).toBe('198.51.100.22');
    expect(qm.isBanned('198.51.100.22')).toBe(true);

    // Compensate -> unquarantine
    await quarantineIpAction.compensate!({ ip: '198.51.100.22' }, output, mockContext);
    expect(qm.isBanned('198.51.100.22')).toBe(false);
  });

  it('should execute and compensate contain_subnet action', async () => {
    const qm = QuarantineManager.getInstance();
    const output = await containSubnetAction.execute({ subnet_cidr: '192.168.10.0/24' }, mockContext);

    expect(output.contained).toBe(true);
    expect(output.subnet_cidr).toBe('192.168.10.0/24');
    expect(qm.isBanned('192.168.10.0')).toBe(true);

    // Compensate -> remove subnet
    await containSubnetAction.compensate!({ subnet_cidr: '192.168.10.0/24' }, output, mockContext);
    expect(qm.isBanned('192.168.10.0')).toBe(false);
  });

  it('should execute revoke_session action', async () => {
    const output = await revokeSessionAction.execute({ user_id: 'usr_abc' }, mockContext);
    expect(output.revoked).toBe(true);
    expect(output.user_id).toBe('usr_abc');
  });

  it('should execute step_up_auth action', async () => {
    const output = await stepUpAuthAction.execute({ user_id: 'usr_xyz', level: 'WEBAUTHN' }, mockContext);
    expect(output.step_up_required).toBe(true);
    expect(output.level).toBe('WEBAUTHN');
  });

  it('should execute rate_limit_throttle action', async () => {
    const output = await rateLimitThrottleAction.execute({ target_key: 'ip:1.1.1.1', multiplier: 0.2 }, mockContext);
    expect(output.throttled).toBe(true);
    expect(output.multiplier).toBe(0.2);
  });

  it('should execute notificationAction and webhookDispatchAction', async () => {
    const notif = await notificationAction.execute({ message: 'Security alert' }, mockContext);
    expect(notif.dispatched).toBe(true);

    const webhook = await webhookDispatchAction.execute({ url: 'https://siem.corp.internal/events' }, mockContext);
    expect(webhook.dispatched).toBe(true);
  });

  it('should register all 7 action handlers in ActionRegistry', () => {
    expect(actionRegistry.hasAction('quarantine_ip')).toBe(true);
    expect(actionRegistry.hasAction('contain_subnet')).toBe(true);
    expect(actionRegistry.hasAction('revoke_session')).toBe(true);
    expect(actionRegistry.hasAction('step_up_auth')).toBe(true);
    expect(actionRegistry.hasAction('rate_limit_throttle')).toBe(true);
    expect(actionRegistry.hasAction('notify_security_team')).toBe(true);
    expect(actionRegistry.hasAction('dispatch_webhook')).toBe(true);
  });
});
