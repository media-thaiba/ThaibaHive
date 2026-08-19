/**
 * SOAR Identity Lockdown Action Handler
 * Sprint-040 — Zero-Trust Account Lockdown & Compensation
 */

import { SoarActionHandler } from '../soar-types';
import { revocationStore } from '../../../../lib/identity/revocation-store';

export const identityLockdownAction: SoarActionHandler<{
  user_id: string;
  reason?: string;
}> = {
  name: 'identity_lockdown',
  description: 'Place compromised user account under strict security hold and invalidate all sessions',
  execute: async (params, context) => {
    const userId = params.user_id || context.target_entity.value;
    if (!userId) throw new Error('user_id parameter is required for identity_lockdown action');

    const reason = params.reason || `[SOAR:${context.playbook_name}] Autonomous account lockdown`;
    revocationStore.revokeUser(userId, reason);

    return {
      user_id: userId,
      locked: true,
      reason,
      locked_at: new Date().toISOString(),
    };
  },
  compensate: async (params, output, context) => {
    const userId = params.user_id || output?.user_id || context.target_entity.value;
    if (userId) {
      revocationStore.unrevokeUser(userId);
    }
  },
};
