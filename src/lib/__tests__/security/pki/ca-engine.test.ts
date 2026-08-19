import { CaEngine } from '@/lib/security/pki/ca-engine';

describe('CaEngine', () => {
  beforeEach(() => {
    CaEngine.resetInstance();
  });

  it('initializes a singleton Root CA certificate', () => {
    const engine = CaEngine.getInstance();
    const rootCert = engine.initializeRootCa();

    expect(rootCert).toBeDefined();
    expect(rootCert.type).toBe('ROOT_CA');
    expect(rootCert.isCa).toBe(true);
    expect(rootCert.subject.commonName).toBe('ThaibaHive Internal Root CA');

    // Calling getRootCertificate returns the same root CA
    const sameRoot = engine.getRootCertificate();
    expect(sameRoot.serialNumber).toBe(rootCert.serialNumber);
  });

  it('issues service certificates signed by Root CA', () => {
    const engine = CaEngine.getInstance();
    const serviceCert = engine.issueServiceCertificate({
      serviceName: 'finance-service',
      sanList: ['finance-service.mesh.thaiba.internal', 'finance-service'],
      validityDays: 60,
    });

    expect(serviceCert.type).toBe('SERVICE_CERT');
    expect(serviceCert.subject.commonName).toBe('finance-service.mesh.thaiba.internal');
    expect(serviceCert.sanList).toContain('finance-service');
    expect(serviceCert.isCa).toBe(false);

    // Verify against Root CA
    const verification = engine.verifyCertificate(serviceCert.certificatePem);
    expect(verification.valid).toBe(true);
    expect(verification.cert?.serialNumber).toBe(serviceCert.serialNumber);
  });

  it('issues client certificates for zero-trust endpoints', () => {
    const engine = CaEngine.getInstance();
    const clientCert = engine.issueClientCertificate({
      clientId: 'node-edge-01',
      role: 'Edge Node Gateway',
    });

    expect(clientCert.type).toBe('CLIENT_CERT');
    expect(clientCert.subject.commonName).toBe('client-node-edge-01.identity.thaiba.internal');

    const verification = engine.verifyCertificate(clientCert.certificatePem);
    expect(verification.valid).toBe(true);
  });

  it('retrieves issued certificates by serial and lists them all', () => {
    const engine = CaEngine.getInstance();
    const cert1 = engine.issueServiceCertificate({ serviceName: 'service-a' });
    const cert2 = engine.issueServiceCertificate({ serviceName: 'service-b' });

    expect(engine.getCertificateBySerial(cert1.serialNumber)).toBeDefined();
    expect(engine.getCertificateBySerial(cert2.serialNumber)).toBeDefined();

    const all = engine.listIssuedCertificates();
    expect(all.length).toBeGreaterThanOrEqual(3); // Root CA + 2 service certs
  });
});
