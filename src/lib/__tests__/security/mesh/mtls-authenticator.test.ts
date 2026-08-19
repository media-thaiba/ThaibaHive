import { CaEngine } from '@/lib/security/pki/ca-engine';
import { MtlsAuthenticator } from '@/lib/security/mesh/mtls-authenticator';
import { ServiceIdentityResolver } from '@/lib/security/mesh/service-identity';

describe('MtlsAuthenticator & ServiceIdentityResolver', () => {
  let caEngine: CaEngine;
  let authenticator: MtlsAuthenticator;

  beforeEach(() => {
    CaEngine.resetInstance();
    caEngine = CaEngine.getInstance();
    authenticator = new MtlsAuthenticator(caEngine);
  });

  it('successfully authenticates a valid service certificate', () => {
    const cert = caEngine.issueServiceCertificate({
      serviceName: 'academic-service',
    });

    const result = authenticator.authenticateRequest({
      clientCertPem: cert.certificatePem,
    });

    expect(result.authenticated).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(result.identity?.serviceName).toBe('academic-service');
    expect(result.identity?.serialNumber).toBe(cert.serialNumber);
  });

  it('rejects missing client certificates', () => {
    const result = authenticator.authenticateRequest({
      clientCertPem: '',
    });

    expect(result.authenticated).toBe(false);
    expect(result.statusCode).toBe(401);
    expect(result.reason).toContain('Missing required');
  });

  it('rejects revoked certificates', () => {
    const cert = caEngine.issueServiceCertificate({
      serviceName: 'finance-service',
    });

    authenticator.addRevokedSerial(cert.serialNumber);

    const result = authenticator.authenticateRequest({
      clientCertPem: cert.certificatePem,
    });

    expect(result.authenticated).toBe(false);
    expect(result.statusCode).toBe(403);
    expect(result.reason).toContain('revoked');
  });

  it('enforces peer service authorization rules', () => {
    const cert = caEngine.issueServiceCertificate({
      serviceName: 'random-untrusted-service',
    });

    // Register strict peer whitelist for finance-service
    ServiceIdentityResolver.registerService('finance-service', 'Financial', ['auth-service', 'academic-service']);

    const result = authenticator.authenticateRequest({
      clientCertPem: cert.certificatePem,
      targetService: 'finance-service',
    });

    expect(result.authenticated).toBe(false);
    expect(result.statusCode).toBe(403);
    expect(result.reason).toContain('not authorized to communicate with');
  });
});
