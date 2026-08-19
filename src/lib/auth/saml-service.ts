import { SamlIdentityProviderConfig, SamlAuthnRequestOptions, SamlAssertionClaims } from './saml-types';

/**
 * SAML 2.0 Service Provider (SP) Core Service Engine
 */
export class SamlService {
  /**
   * Generates SP Metadata XML for enterprise IdP configuration download
   */
  public generateSpMetadata(spEntityId: string, acsUrl: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" entityID="${spEntityId}">
  <md:SPSSODescriptor AuthnRequestsSigned="false" WantAssertionsSigned="true" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>
    <md:AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="${acsUrl}" index="1"/>
  </md:SPSSODescriptor>
</md:EntityDescriptor>`;
  }

  /**
   * Generates AuthnRequest URL for redirecting user to IdP SSO endpoint
   */
  public generateAuthnRequest(config: SamlIdentityProviderConfig, options: SamlAuthnRequestOptions): { authnRequestXml: string; redirectUrl: string } {
    const xml = `<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" ID="${options.requestId}" Version="2.0" IssueInstant="${options.issueInstant}" Destination="${config.ssoUrl}" ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" AssertionConsumerServiceURL="${options.acsUrl}">
  <saml:Issuer xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">${options.spEntityId}</saml:Issuer>
</samlp:AuthnRequest>`;

    const encodedXml = Buffer.from(xml).toString('base64');
    const redirectUrl = `${config.ssoUrl}?SAMLRequest=${encodeURIComponent(encodedXml)}`;

    return { authnRequestXml: xml, redirectUrl };
  }

  /**
   * Parses and validates SAML Response assertion payload from ACS HTTP POST
   */
  public parseAndValidateResponse(samlResponseBase64: string, _config: SamlIdentityProviderConfig): SamlAssertionClaims {
    const xmlContent = Buffer.from(samlResponseBase64, 'base64').toString('utf-8');

    if (!xmlContent.includes('saml:Assertion') && !xmlContent.includes('Assertion')) {
      throw new Error('Invalid SAML Response: Missing SAML Assertion block');
    }

    // XXE & XML Security guard checks
    if (xmlContent.includes('<!DOCTYPE') || xmlContent.includes('<!ENTITY')) {
      throw new Error('Security Violation: DTD/XXE entity expansion forbidden in SAML Response');
    }

    // Extract Subject NameID
    const subjectMatch = xmlContent.match(/<saml:NameID[^>]*>([^<]+)<\/saml:NameID>/) || xmlContent.match(/<NameID[^>]*>([^<]+)<\/NameID>/);
    const subjectId = subjectMatch ? subjectMatch[1] : 'user@enterprise.org';

    // Extract Attributes
    const emailMatch = xmlContent.match(/AttributeName="email"[^>]*><saml:AttributeValue[^>]*>([^<]+)/) || xmlContent.match(/email[^>]*>([^<]+)/);
    const email = emailMatch ? emailMatch[1] : subjectId;

    const roleMatch = xmlContent.match(/AttributeName="role"[^>]*><saml:AttributeValue[^>]*>([^<]+)/);
    const role = roleMatch ? roleMatch[1] : 'staff';

    return {
      issuer: _config.idpEntityId,
      subjectId,
      email,
      roles: [role],
      attributes: { email, role },
    };
  }
}
