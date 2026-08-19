import { CrlManager } from '@/lib/security/pki/crl-manager';
import { MtlsAuthenticator } from '@/lib/security/mesh/mtls-authenticator';
import { CertMeshSync, MeshCertEvent } from '@/lib/security/mesh/cert-mesh-sync';

describe('CertMeshSync', () => {
  let crlManager: CrlManager;
  let authenticator: MtlsAuthenticator;

  beforeEach(() => {
    CrlManager.resetInstance();
    CertMeshSync.resetInstance();
    crlManager = CrlManager.getInstance();
    authenticator = new MtlsAuthenticator();
  });

  it('broadcasts revocation events and updates local CRL and authenticator', () => {
    const meshSync = CertMeshSync.getInstance('node-1', crlManager, authenticator);
    const events: MeshCertEvent[] = [];
    meshSync.onEvent((e) => events.push(e));

    const serial = 'TEST-SERIAL-12345';
    meshSync.publishRevocation(serial, 'KEY_COMPROMISE');

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('CERT_REVOKED');
    expect(events[0].serialNumber).toBe(serial);
    expect(crlManager.isRevoked(serial)).toBe(true);
  });

  it('broadcasts rotation events to subscribers', () => {
    const meshSync = CertMeshSync.getInstance('node-2', crlManager, authenticator);
    const events: MeshCertEvent[] = [];
    meshSync.onEvent((e) => events.push(e));

    meshSync.publishRotation('academic-service', 'NEW-SERIAL-999');

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('CERT_ROTATED');
    expect(events[0].serviceName).toBe('academic-service');
  });

  it('handles remote node revocation events properly', () => {
    const meshSync = CertMeshSync.getInstance('node-local', crlManager, authenticator);
    const remoteSerial = 'REMOTE-REVOKED-777';

    meshSync.handleIncomingEvent({
      type: 'CERT_REVOKED',
      serialNumber: remoteSerial,
      reason: 'CA_COMPROMISE',
      sourceNodeId: 'node-remote-99',
      timestamp: new Date().toISOString(),
    });

    expect(crlManager.isRevoked(remoteSerial)).toBe(true);
  });
});
