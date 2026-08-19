import { CrlManager } from '@/lib/security/pki/crl-manager';

describe('CrlManager', () => {
  beforeEach(() => {
    CrlManager.resetInstance();
  });

  it('manages singleton revocation list', () => {
    const crl = CrlManager.getInstance();
    const serial = 'AABBCCDDEEFF00112233445566778899';

    expect(crl.isRevoked(serial)).toBe(false);

    const record = crl.revokeCertificate({
      serialNumber: serial,
      reason: 'KEY_COMPROMISE',
      revokedBy: 'sec-admin-1',
    });

    expect(record.serialNumber).toBe(serial);
    expect(crl.isRevoked(serial)).toBe(true);
    expect(crl.getRevocation(serial)?.reason).toBe('KEY_COMPROMISE');
  });

  it('bulk loads revocation records from external source', () => {
    const crl = CrlManager.getInstance();
    crl.loadRevocations([
      { serialNumber: 'SER1', revokedAt: new Date().toISOString(), reason: 'SUPERSEDED', revokedBy: 'sync' },
      { serialNumber: 'SER2', revokedAt: new Date().toISOString(), reason: 'CA_COMPROMISE', revokedBy: 'sync' },
    ]);

    expect(crl.isRevoked('SER1')).toBe(true);
    expect(crl.isRevoked('SER2')).toBe(true);
    expect(crl.listRevocations()).toHaveLength(2);
  });
});
