import { SamlService } from '../auth/saml-service';
import { OidcService } from '../auth/oidc-service';

describe('Enterprise Identity Federation Security Audit', () => {
  const samlService = new SamlService();
  const oidcService = new OidcService();

  const mockProvider = {
    id: 'prov-1',
    tenantId: 'campus-1',
    name: 'Azure AD',
    idpEntityId: 'https://sts.windows.net/tenant-id/',
    ssoUrl: 'https://login.microsoftonline.com/saml2',
    x509Certificate: 'MII...',
    isActive: true,
  };

  it('should generate SP metadata XML with valid schema', () => {
    const metadataXml = samlService.generateSpMetadata('https://app.thaibahive.org/sp', 'https://app.thaibahive.org/acs');
    expect(metadataXml).toContain('EntityDescriptor');
    expect(metadataXml).toContain('AssertionConsumerService');
    expect(metadataXml).toContain('Location="https://app.thaibahive.org/acs"');
  });

  it('should reject SAML assertions containing forbidden XXE entity expansion', () => {
    const maliciousXml = `<?xml version="1.0"?>
    <!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
    <saml:Assertion xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">&xxe;</saml:Assertion>`;

    const b64 = Buffer.from(maliciousXml).toString('base64');
    expect(() => samlService.parseAndValidateResponse(b64, mockProvider)).toThrow('Security Violation: DTD/XXE entity expansion forbidden');
  });

  it('should generate valid PKCE code verifier and S256 challenge for OIDC', () => {
    const { codeVerifier, codeChallenge } = oidcService.generatePkce();
    expect(codeVerifier).toBeTruthy();
    expect(codeChallenge).toBeTruthy();
    expect(codeVerifier.length).toBeGreaterThan(30);
    expect(codeChallenge).not.toEqual(codeVerifier);
  });
});
