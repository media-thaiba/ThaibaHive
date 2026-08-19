import { CaEngine } from '@/lib/security/pki/ca-engine';
import { CrlManager } from '@/lib/security/pki/crl-manager';
import { CertRotationManager } from '@/lib/security/pki/cert-rotation-manager';

describe('CertRotationManager', () => {
  let caEngine: CaEngine;
  let crlManager: CrlManager;
  let rotationManager: CertRotationManager;

  beforeEach(() => {
    CaEngine.resetInstance();
    CrlManager.resetInstance();
    caEngine = CaEngine.getInstance();
    crlManager = CrlManager.getInstance();
    rotationManager = new CertRotationManager(caEngine, crlManager);
  });

  it('registers and retrieves active service certificates', () => {
    const cert = rotationManager.registerServiceCertificate('auth-service');
    expect(cert).toBeDefined();
    expect(cert.subject.commonName).toContain('auth-service');

    const retrieved = rotationManager.getActiveCertificate('auth-service');
    expect(retrieved?.serialNumber).toBe(cert.serialNumber);
  });

  it('evaluates status and indicates when rotation is needed', () => {
    const cert = rotationManager.registerServiceCertificate('gateway');
    const status = rotationManager.evaluateStatus('gateway');

    expect(status.serviceName).toBe('gateway');
    expect(status.currentSerial).toBe(cert.serialNumber);
    expect(status.percentageRemaining).toBeGreaterThan(90);
    expect(status.needsRotation).toBe(false);

    // If revoked, needsRotation becomes true immediately
    crlManager.revokeCertificate({ serialNumber: cert.serialNumber });
    const revokedStatus = rotationManager.evaluateStatus('gateway');
    expect(revokedStatus.isRevoked).toBe(true);
    expect(revokedStatus.needsRotation).toBe(true);
  });

  it('rotates certificate and maintains dual-certificate acceptance during grace period', () => {
    const oldCert = rotationManager.registerServiceCertificate('finance-service');
    const oldSerial = oldCert.serialNumber;

    const rotationResult = rotationManager.rotateCertificate('finance-service');
    const newCert = rotationResult.newCert;
    const newSerial = newCert.serialNumber;

    expect(newSerial).not.toBe(oldSerial);
    expect(rotationResult.oldCert.serialNumber).toBe(oldSerial);

    // Both old and new certificates are accepted during grace window
    expect(rotationManager.isCertificateAccepted('finance-service', newSerial)).toBe(true);
    expect(rotationManager.isCertificateAccepted('finance-service', oldSerial)).toBe(true);

    // If old cert is explicitly revoked in CRL, it is no longer accepted
    crlManager.revokeCertificate({ serialNumber: oldSerial });
    expect(rotationManager.isCertificateAccepted('finance-service', oldSerial)).toBe(false);
  });
});
