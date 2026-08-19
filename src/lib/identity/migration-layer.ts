import { decodeJwt } from 'jose';
import { db } from '@thaiba/db';
import { identity_sessions } from '@thaiba/db/schema';
import { eq } from 'drizzle-orm';
import { cryptoAuditWriter } from '@/lib/audit/crypto-writer';

export function isDPoPToken(token: string): boolean {
  try {
    const decoded: any = decodeJwt(token);
    return !!(decoded.cnf && decoded.cnf.jkt);
  } catch {
    return false;
  }
}

export async function getMigrationStats() {
  try {
    const sessions = await db.select().from(identity_sessions).all();
    const total = sessions.length;
    const migrated = sessions.filter(s => s.dpop_migrated).length;
    const legacy = total - migrated;
    const percentage = total > 0 ? (migrated / total) * 100 : 0;

    return { total, migrated, legacy, percentage };
  } catch {
    return { total: 0, migrated: 0, legacy: 0, percentage: 0 };
  }
}

export async function logMigrationEvent(userId: string, sessionId: string, type: 'migration.token.legacy' | 'migration.token.dpop') {
  await cryptoAuditWriter.log({
    action: 'IDENTITY_MIGRATION',
    entityType: 'SESSION',
    entityId: sessionId,
    userId,
    payload: {
      type,
      timestamp: new Date().toISOString()
    }
  });
}
