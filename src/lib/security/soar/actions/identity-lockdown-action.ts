/**
 * SOAR Identity Lockdown Action Handler
 * Sprint-040 — Zero-Trust Account Lockdown & Compensation (DB-Backed)
 */

import { SoarActionHandler } from '../soar-types';
import { db } from '@/db';
import { staff, userSessions } from '@thaiba/db/schema';
import { eq, and, sql } from 'drizzle-orm';

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

    await db.transaction(async (tx) => {
      await tx
        .update(staff)
        .set({
          isActive: false,
          tokenVersion: sql`coalesce(${staff.tokenVersion}, 1) + 1`,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(staff.id, userId))
        .run();

      await tx
        .update(userSessions)
        .set({ status: 'terminated', logoutAt: Date.now() })
        .where(and(eq(userSessions.staffId, userId), eq(userSessions.status, 'active')))
        .run();
    });

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
      await db
        .update(staff)
        .set({
          isActive: true,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(staff.id, userId))
        .run();
    }
  },
};
