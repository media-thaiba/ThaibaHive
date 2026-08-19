import { CaEngine } from '@/lib/security/pki/ca-engine';
import { MtlsAuthenticator } from '@/lib/security/mesh/mtls-authenticator';
import { MtlsClient } from '@/lib/security/mesh/mtls-client';

describe('MtlsClient', () => {
  let caEngine: CaEngine;
  let authenticator: MtlsAuthenticator;

  beforeEach(() => {
    CaEngine.resetInstance();
    caEngine = CaEngine.getInstance();
    authenticator = new MtlsAuthenticator(caEngine);
  });

  it('prepares mTLS headers with base64 encoded certificate and fingerprints', () => {
    const cert = caEngine.issueServiceCertificate({ serviceName: 'gateway' });
    const client = new MtlsClient(cert, authenticator);

    const headers = client.prepareHeaders({ 'Content-Type': 'application/json' });
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['x-mtls-client-serial']).toBe(cert.serialNumber);
    expect(headers['x-mtls-client-fingerprint']).toBe(cert.fingerprintSha256);
    expect(headers['x-mtls-client-cert']).toBeDefined();
  });

  it('dispatches authenticated inter-service requests successfully', async () => {
    const cert = caEngine.issueServiceCertificate({ serviceName: 'auth-service' });
    const client = new MtlsClient(cert, authenticator);

    const response = await client.dispatch({
      url: 'https://academic-service.mesh.thaiba.internal/api/students',
      targetService: 'academic-service',
      body: { action: 'query' },
    });

    expect(response.status).toBe(200);
    expect(response.auth.authenticated).toBe(true);
    expect(response.data.service).toBe('auth-service');
  });

  it('returns failure when certificate is revoked upon dispatch', async () => {
    const cert = caEngine.issueServiceCertificate({ serviceName: 'compromised-service' });
    authenticator.addRevokedSerial(cert.serialNumber);

    const client = new MtlsClient(cert, authenticator);
    const response = await client.dispatch({
      url: 'https://finance-service.mesh.thaiba.internal/api/billing',
    });

    expect(response.status).toBe(403);
    expect(response.auth.authenticated).toBe(false);
  });
});
