import { CertGenerator } from '@/lib/security/pki/cert-generator';

describe('CertGenerator', () => {
  describe('generateKeyPair', () => {
    it('generates an ECDSA keypair by default', () => {
      const result = CertGenerator.generateKeyPair('ECDSA');
      expect(result.publicKeyPem).toContain('BEGIN PUBLIC KEY');
      expect(result.privateKeyPem).toContain('BEGIN PRIVATE KEY');
      expect(result.algorithm).toBe('ECDSA');
      expect(result.keyFingerprint).toHaveLength(64);
    });

    it('generates an RSA keypair when requested', () => {
      const result = CertGenerator.generateKeyPair('RSA', { keySize: 2048 });
      expect(result.publicKeyPem).toContain('BEGIN PUBLIC KEY');
      expect(result.privateKeyPem).toContain('BEGIN PRIVATE KEY');
      expect(result.algorithm).toBe('RSA');
      expect(result.keyFingerprint).toHaveLength(64);
    });
  });

  describe('generateSerialNumber', () => {
    it('generates a 32-character hex serial number', () => {
      const serial = CertGenerator.generateSerialNumber();
      expect(serial).toHaveLength(32);
      expect(/^[0-9A-F]+$/.test(serial)).toBe(true);
    });
  });

  describe('createCertificate & verifyCertificate', () => {
    it('creates and verifies a self-signed root certificate', () => {
      const cert = CertGenerator.createCertificate({
        type: 'ROOT_CA',
        subject: { commonName: 'Test Root CA', organization: 'Thaiba Test' },
        validityDays: 365,
        isCa: true,
      });

      expect(cert.serialNumber).toBeDefined();
      expect(cert.certificatePem).toContain('BEGIN CERTIFICATE');
      expect(cert.fingerprintSha256).toHaveLength(64);
      expect(cert.isCa).toBe(true);

      const verification = CertGenerator.verifyCertificate(cert.certificatePem, cert.publicKeyPem);
      expect(verification.valid).toBe(true);
      expect(verification.cert?.subject.commonName).toBe('Test Root CA');
    });

    it('creates a leaf certificate signed by a root CA and verifies against root public key', () => {
      const rootCert = CertGenerator.createCertificate({
        type: 'ROOT_CA',
        subject: { commonName: 'Root CA' },
        validityDays: 365,
      });

      const leafCert = CertGenerator.createCertificate({
        type: 'SERVICE_CERT',
        subject: { commonName: 'auth-service.mesh.thaiba.internal' },
        issuerSubject: rootCert.subject,
        issuerPrivateKeyPem: rootCert.privateKeyPem,
        sanList: ['auth-service', 'localhost'],
        validityDays: 90,
      });

      expect(leafCert.type).toBe('SERVICE_CERT');
      expect(leafCert.issuer.commonName).toBe('Root CA');

      const verification = CertGenerator.verifyCertificate(leafCert.certificatePem, rootCert.publicKeyPem);
      expect(verification.valid).toBe(true);
      expect(verification.cert?.sanList).toContain('auth-service');
    });

    it('rejects an altered certificate with invalid signature', () => {
      const rootCert = CertGenerator.createCertificate({
        type: 'ROOT_CA',
        subject: { commonName: 'Root CA' },
        validityDays: 365,
      });

      const fakeRoot = CertGenerator.createCertificate({
        type: 'ROOT_CA',
        subject: { commonName: 'Attacker CA' },
        validityDays: 365,
      });

      const verification = CertGenerator.verifyCertificate(rootCert.certificatePem, fakeRoot.publicKeyPem);
      expect(verification.valid).toBe(false);
      expect(verification.reason).toContain('signature');
    });
  });
});
