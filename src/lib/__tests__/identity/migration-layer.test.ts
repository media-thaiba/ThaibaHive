import { isDPoPToken, getMigrationStats, logMigrationEvent } from '../../identity/migration-layer';
import { db } from '@thaiba/db';
import { cryptoAuditWriter } from '@/lib/audit/crypto-writer';

jest.mock('@thaiba/db', () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    all: jest.fn(),
  }
}));

jest.mock('@/lib/audit/crypto-writer', () => ({
  cryptoAuditWriter: {
    log: jest.fn()
  }
}));

jest.mock('jose', () => ({
  decodeJwt: jest.fn((token: string) => {
    if (token === 'dpop_token') return { cnf: { jkt: 'thumbprint123' } };
    if (token === 'legacy_token') return { staffId: '123' };
    throw new Error('invalid token');
  })
}));

describe('Migration Layer', () => {
  it('should detect DPoP tokens correctly', () => {
    expect(isDPoPToken('dpop_token')).toBe(true);
    expect(isDPoPToken('legacy_token')).toBe(false);
    expect(isDPoPToken('invalid')).toBe(false);
  });

  it('should return migration stats', async () => {
    (db.all as jest.Mock).mockResolvedValue([
      { dpop_migrated: true },
      { dpop_migrated: true },
      { dpop_migrated: false },
    ]);

    const stats = await getMigrationStats();
    expect(stats.total).toBe(3);
    expect(stats.migrated).toBe(2);
    expect(stats.legacy).toBe(1);
    expect(stats.percentage).toBeCloseTo(66.67);
  });

  it('should log migration events', async () => {
    await logMigrationEvent('user1', 'session1', 'migration.token.dpop');
    expect(cryptoAuditWriter.log).toHaveBeenCalledWith(expect.objectContaining({
      action: 'IDENTITY_MIGRATION',
      entityId: 'session1',
      userId: 'user1'
    }));
  });
});
