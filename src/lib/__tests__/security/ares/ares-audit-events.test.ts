/**
 * Unit tests for AresAuditLogger (ARES-018)
 */

import { AresAuditLogger } from '@/lib/security/ares/ares-audit-events';
import { cryptoAuditWriter } from '@/lib/audit/crypto-writer';

jest.mock('@/lib/audit/crypto-writer', () => ({
  cryptoAuditWriter: {
    log: jest.fn().mockResolvedValue({ blockId: 'block-mock-1', signature: 'sig-mock' }),
  },
}));

describe('ARES-018: AresAuditLogger', () => {
  it('should format and emit cryptographically structured audit payloads', async () => {
    await AresAuditLogger.logEvent(
      'ARES_THREAT_PREDICTED',
      'fc-threat-1',
      {
        category: 'CREDENTIAL_STUFFING',
        probability: 0.85,
      },
      'tenant-master'
    );

    expect(cryptoAuditWriter.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'ARES_THREAT_PREDICTED',
        entityId: 'fc-threat-1',
        entityType: 'PREDICTIVE_RESILIENCE',
        tenantId: 'tenant-master',
      })
    );
  });
});
