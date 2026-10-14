import crypto from 'crypto';
import { SamlService, exclusiveC14N } from '../auth/saml-service';
import { OidcService } from '../auth/oidc-service';
import { SsoAuditLedger } from '../auth/sso-audit-ledger';

describe('Enterprise Identity Federation Security Audit (Phase 12 / Track 3A)', () => {
  const samlService = new SamlService();
  const oidcService = new OidcService();

  const mockProvider = {
    id: 'prov-1',
    institutionId: 'campus-1',
    name: 'Azure AD',
    entityId: 'https://sts.windows.net/tenant-id/',
    ssoUrl: 'https://login.microsoftonline.com/saml2',
    x509Certificate: 'MII...',
    isActive: true,
  };

  describe('SAML 2.0 Security & SP Metadata Invariants', () => {
    it('should generate SP metadata XML with valid schema and ACS location', () => {
      const metadataXml = samlService.generateSpMetadata(
        'https://app.thaibahive.org/sp',
        'https://app.thaibahive.org/acs'
      );
      expect(metadataXml).toContain('EntityDescriptor');
      expect(metadataXml).toContain('AssertionConsumerService');
      expect(metadataXml).toContain('Location="https://app.thaibahive.org/acs"');
      expect(metadataXml).toContain('WantAssertionsSigned="true"');
    });

    it('should reject SAML assertions containing forbidden XXE entity expansion (Fail-Closed)', () => {
      const maliciousXml = `<?xml version="1.0"?>
      <!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
      <saml:Assertion xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">&xxe;</saml:Assertion>`;

      const b64 = Buffer.from(maliciousXml).toString('base64');
      expect(() => samlService.parseAndValidateResponse(b64, mockProvider)).toThrow(
        'Security Violation: DTD/XXE entity expansion forbidden'
      );
    });

    it('should enforce Exclusive XML Canonicalization (C14N)', () => {
      const inputXml = `
        <saml:Assertion   xmlns:z="urn:z"   xmlns:a="urn:a"   id="123"  version="2.0"  >
          <saml:Subject />
        </saml:Assertion>
      `;
      const canonical = exclusiveC14N(inputXml);
      // Namespaces must be sorted first, followed by attributes
      expect(canonical).toContain('xmlns:a="urn:a" xmlns:z="urn:z" id="123" version="2.0"');
      // Self-closing tags should be expanded into start/end tags
      expect(canonical).toContain('<saml:Subject></saml:Subject>');
    });

    it('should detect and reject assertion replay attacks within 600s TTL', () => {
      const uniqueId = `assert_replay_test_${Date.now()}`;
      const now = new Date().toISOString();
      const validAssertionXml = `
        <samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">
          <saml:Assertion ID="${uniqueId}" IssueInstant="${now}" Version="2.0">
            <saml:Subject>
              <saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">test.replay@thaibahive.org</saml:NameID>
            </saml:Subject>
          </saml:Assertion>
        </samlp:Response>
      `;

      const b64 = Buffer.from(validAssertionXml).toString('base64');
      // First validation succeeds
      const claims = samlService.parseAndValidateResponse(b64, mockProvider, { enforceSignature: false });
      expect(claims.subjectId).toBe('test.replay@thaibahive.org');

      // Second validation with identical assertion ID must trigger replay violation
      expect(() =>
        samlService.parseAndValidateResponse(b64, mockProvider, { enforceSignature: false })
      ).toThrow(`Security Violation: SAML Assertion replay detected (ID: ${uniqueId})`);
    });

    it('should reject assertions exceeding allowable clock skew (+/- 300s)', () => {
      const expiredTime = new Date(Date.now() - 3600 * 1000).toISOString(); // 1 hour in the past
      const expiredAssertionXml = `
        <samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">
          <saml:Assertion ID="assert_skew_${Date.now()}" IssueInstant="${expiredTime}" Version="2.0">
            <saml:Conditions NotBefore="${expiredTime}" NotOnOrAfter="${expiredTime}" />
            <saml:Subject>
              <saml:NameID>expired.user@thaibahive.org</saml:NameID>
            </saml:Subject>
          </saml:Assertion>
        </samlp:Response>
      `;

      const b64 = Buffer.from(expiredAssertionXml).toString('base64');
      expect(() =>
        samlService.parseAndValidateResponse(b64, mockProvider, { enforceSignature: false, allowedClockSkewSeconds: 300 })
      ).toThrow('Security Violation: SAML assertion expired or timestamp skew exceeds limit');
    });

    it('should cryptographically verify digital signature with RSA-SHA256 and reject tampered payloads', () => {
      // Generate RSA key pair for testing
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });

      const certDer = crypto.createHash('sha256').update(publicKey).digest('base64'); // Mock cert string
      const assertionId = `assert_sig_${Date.now()}`;
      const now = new Date().toISOString();

      const rawAssertion = `<saml:Assertion xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" ID="${assertionId}" IssueInstant="${now}" Version="2.0"><saml:Subject><saml:NameID>faculty@thaibahive.org</saml:NameID></saml:Subject></saml:Assertion>`;
      const canonicalAssertion = exclusiveC14N(rawAssertion);
      const digestValue = crypto.createHash('sha256').update(canonicalAssertion, 'utf8').digest('base64');

      const signedInfoXml = `<ds:SignedInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#"><ds:CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/><ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/><ds:Reference URI="#${assertionId}"><ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/><ds:DigestValue>${digestValue}</ds:DigestValue></ds:Reference></ds:SignedInfo>`;
      const canonicalSignedInfo = exclusiveC14N(signedInfoXml);

      const signer = crypto.createSign('RSA-SHA256');
      signer.update(canonicalSignedInfo, 'utf8');
      const signatureValue = signer.sign(privateKey, 'base64');

      const signedXml = `<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">
        <saml:Assertion xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" ID="${assertionId}" IssueInstant="${now}" Version="2.0">
          <ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
            ${signedInfoXml}
            <ds:SignatureValue>${signatureValue}</ds:SignatureValue>
            <ds:KeyInfo><ds:X509Data><ds:X509Certificate>${certDer}</ds:X509Certificate></ds:X509Data></ds:KeyInfo>
          </ds:Signature>
          <saml:Subject><saml:NameID>faculty@thaibahive.org</saml:NameID></saml:Subject>
        </saml:Assertion>
      </samlp:Response>`;

      const providerWithKey = {
        ...mockProvider,
        x509Certificate: publicKey,
        wantAssertionsSigned: true,
      };

      // 1. Valid signature passes
      const validB64 = Buffer.from(signedXml).toString('base64');
      const claims = samlService.parseAndValidateResponse(validB64, providerWithKey, { enforceSignature: true });
      expect(claims.subjectId).toBe('faculty@thaibahive.org');

      // 2. Tampered assertion body triggers digest mismatch
      const tamperedXml = signedXml.replace('faculty@thaibahive.org', 'hacker@thaibahive.org');
      const tamperedB64 = Buffer.from(tamperedXml).toString('base64');
      expect(() =>
        samlService.parseAndValidateResponse(tamperedB64, providerWithKey, {
          enforceSignature: true,
          checkReplay: false,
        })
      ).toThrow('Security Violation: SAML Assertion digest mismatch');

      // 3. Forged signature value triggers verification failure
      const forgedSigXml = signedXml.replace(signatureValue, Buffer.from('forged_signature_bytes_padding_1234567890').toString('base64'));
      const forgedB64 = Buffer.from(forgedSigXml).toString('base64');
      expect(() =>
        samlService.parseAndValidateResponse(forgedB64, providerWithKey, {
          enforceSignature: true,
          checkReplay: false,
        })
      ).toThrow('Security Violation: SAML digital signature verification failed');
    });
  });

  describe('OIDC PKCE & CSRF State Security Invariants', () => {
    it('should generate valid PKCE code verifier and S256 challenge for OIDC (RFC 7636)', () => {
      const { codeVerifier, codeChallenge } = oidcService.generatePkce();
      expect(codeVerifier).toBeTruthy();
      expect(codeChallenge).toBeTruthy();
      expect(codeVerifier.length).toBeGreaterThan(30);
      expect(codeChallenge).not.toEqual(codeVerifier);

      // Verify mathematical relation: SHA256(verifier).base64url == challenge
      const recomputed = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
      expect(recomputed).toBe(codeChallenge);
    });

    it('should generate and verify HMAC-SHA256 signed CSRF state token', () => {
      const stateToken = oidcService.generateState({
        institutionId: 'inst-001',
        providerId: 'oidc-google',
        returnUrl: '/dashboard',
      });

      expect(stateToken).toContain('.');
      const payload = oidcService.verifyState(stateToken);
      expect(payload.institutionId).toBe('inst-001');
      expect(payload.providerId).toBe('oidc-google');
      expect(payload.returnUrl).toBe('/dashboard');
      expect(payload.expiresAt).toBeGreaterThan(Date.now());
    });

    it('should reject tampered or corrupted state tokens', () => {
      const stateToken = oidcService.generateState({
        institutionId: 'inst-001',
        providerId: 'oidc-google',
      });

      const [body, sig] = stateToken.split('.');
      // Tamper with body
      const tamperedBody = Buffer.from(JSON.stringify({ institutionId: 'hacker-tenant' })).toString('base64url');
      const tamperedToken = `${tamperedBody}.${sig}`;

      expect(() => oidcService.verifyState(tamperedToken)).toThrow(
        'Security Violation: OIDC state token HMAC signature mismatch'
      );
    });
  });

  describe('Append-Only Merkle Audit Integrity', () => {
    it('should compute deterministic SHA-256 Merkle chain linkages', () => {
      const hash1 = SsoAuditLedger.computeSha256('event_1');
      const hash2 = SsoAuditLedger.computeSha256(`${hash1}:event_2`);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
      expect(hash2).toMatch(/^[a-f0-9]{64}$/);
      expect(hash1).not.toBe(hash2);
    });
  });
});
