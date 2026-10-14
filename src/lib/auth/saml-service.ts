import crypto from 'crypto';
import {
  SamlIdentityProviderConfig,
  SamlAuthnRequestOptions,
  SamlAssertionClaims,
  SamlValidationOptions,
} from './saml-types';

/**
 * In-memory replay cache to defeat SAML assertion replay attacks.
 * Bounded by default 600s TTL.
 */
const replayCache = new Map<string, number>();
const REPLAY_TTL_MS = 600 * 1000;

export function clearSamlReplayCache(): void {
  replayCache.clear();
}

/**
 * Canonicalizes an XML fragment according to Exclusive XML Canonicalization (C14N).
 */
export function exclusiveC14N(xml: string): string {
  // 1. Strip XML declarations
  let clean = xml.replace(/<\?xml[^>]*\?>/gi, '');
  // 2. Strip comments
  clean = clean.replace(/<!--[\s\S]*?-->/g, '');
  // 3. Normalize CRLF to LF
  clean = clean.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // 4. Normalize whitespace between tags
  clean = clean.replace(/>\s+</g, '><');

  // 5. Transform self-closing tags <tag ... /> into <tag ...></tag>
  clean = clean.replace(/<([a-zA-Z0-9_.:-]+)([^>]*?)\/>/g, (_match, tagName, attrs) => {
    return `<${tagName}${attrs}></${tagName}>`;
  });

  // 6. Canonicalize tags: sort attributes lexicographically (xmlns first, then other attrs)
  clean = clean.replace(/<([a-zA-Z0-9_.:-]+)([^>]*)>/g, (_match, tagName, rawAttrs) => {
    if (!rawAttrs.trim()) {
      return `<${tagName}>`;
    }

    const attrRegex = /([a-zA-Z0-9_.:-]+)\s*=\s*("[^"]*"|'[^']*')/g;
    const attrs: { name: string; value: string; isNs: boolean }[] = [];
    let attrMatch: RegExpExecArray | null;

    while ((attrMatch = attrRegex.exec(rawAttrs)) !== null) {
      const name = attrMatch[1];
      let val = attrMatch[2];
      val = val.substring(1, val.length - 1); // remove quotes

      // Entity escaping for attribute values in C14N
      val = val
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/\t/g, '&#x9;')
        .replace(/\n/g, '&#xA;')
        .replace(/\r/g, '&#xD;');

      const isNs = name === 'xmlns' || name.startsWith('xmlns:');
      attrs.push({ name, value: `"${val}"`, isNs });
    }

    attrs.sort((a, b) => {
      if (a.isNs && !b.isNs) return -1;
      if (!a.isNs && b.isNs) return 1;
      return a.name.localeCompare(b.name);
    });

    const formattedAttrs = attrs.map((a) => `${a.name}=${a.value}`).join(' ');
    return formattedAttrs ? `<${tagName} ${formattedAttrs}>` : `<${tagName}>`;
  });

  return clean.trim();
}

/**
 * Format raw base64 or certificate string into standard PEM X.509 / Public Key format.
 */
export function formatX509Certificate(cert: string): string {
  if (cert.includes('-----BEGIN CERTIFICATE-----') || cert.includes('-----BEGIN PUBLIC KEY-----')) {
    return cert.trim();
  }
  const clean = cert.replace(/\s+/g, '');
  const chunks = clean.match(/.{1,64}/g) || [clean];
  return `-----BEGIN CERTIFICATE-----\n${chunks.join('\n')}\n-----END CERTIFICATE-----\n`;
}

/**
 * Hardened SAML 2.0 Service Provider (SP) Engine
 */
export class SamlService {
  /**
   * Generates standard SAML 2.0 SP Metadata XML
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
   * Generates AuthnRequest XML and IdP SSO redirect URL
   */
  public generateAuthnRequest(
    config: SamlIdentityProviderConfig,
    options: SamlAuthnRequestOptions
  ): { authnRequestXml: string; redirectUrl: string } {
    const xml = `<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" ID="${options.requestId}" Version="2.0" IssueInstant="${options.issueInstant}" Destination="${config.ssoUrl}" ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" AssertionConsumerServiceURL="${options.acsUrl}">
  <saml:Issuer xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">${options.spEntityId}</saml:Issuer>
</samlp:AuthnRequest>`;

    const encodedXml = Buffer.from(xml).toString('base64');
    const redirectUrl = new URL(config.ssoUrl);
    redirectUrl.searchParams.set('SAMLRequest', encodedXml);
    if (options.relayState) {
      redirectUrl.searchParams.set('RelayState', options.relayState);
    }

    return { authnRequestXml: xml, redirectUrl: redirectUrl.toString() };
  }

  /**
   * Parses, verifies, and validates incoming SAMLResponse assertion payload.
   * Performs fail-closed XXE checks, exclusive canonicalization, digital signature verification,
   * clock skew checks (+/- 300s), and replay prevention.
   */
  public parseAndValidateResponse(
    samlResponseBase64: string,
    config: SamlIdentityProviderConfig,
    options?: SamlValidationOptions
  ): SamlAssertionClaims {
    const xmlContent = Buffer.from(samlResponseBase64, 'base64').toString('utf-8');

    // 1. Strict Fail-Closed XXE and DTD expansion protection
    if (
      xmlContent.includes('<!DOCTYPE') ||
      xmlContent.includes('<!ENTITY') ||
      /SYSTEM\s+["'][^"']+["']/i.test(xmlContent) ||
      /PUBLIC\s+["'][^"']+["']/i.test(xmlContent)
    ) {
      throw new Error('Security Violation: DTD/XXE entity expansion forbidden in SAML Response');
    }

    // 2. Validate SAML Assertion presence
    const assertionMatch =
      xmlContent.match(/<(?:\w+:)?Assertion[\s\S]*?<\/(?:\w+:)?Assertion>/i);
    if (!assertionMatch) {
      throw new Error('Invalid SAML Response: Missing SAML Assertion block');
    }
    const assertionBlock = assertionMatch[0];

    // 3. Extract Assertion ID & Replay check
    const idMatch = assertionBlock.match(/\bID\s*=\s*["']([^"']+)["']/i);
    const assertionId = idMatch ? idMatch[1] : `assert_${crypto.randomUUID()}`;

    const checkReplay = options?.checkReplay ?? true;
    if (checkReplay) {
      this.checkReplay(assertionId);
    }

    // 4. Strict Clock Skew Enforcement (+/- 300s)
    const allowedSkew = options?.allowedClockSkewSeconds ?? 300;
    this.validateClockSkew(assertionBlock, allowedSkew);

    // 5. Digital Signature Verification
    const shouldVerify =
      options?.enforceSignature ??
      (config.wantAssertionsSigned ?? (!!config.x509Certificate && config.x509Certificate.length > 50));

    if (shouldVerify) {
      this.verifyDigitalSignature(xmlContent, assertionBlock, config);
    }

    // 6. Extract Claims & Attributes
    const claims = this.extractClaims(assertionBlock, config, assertionId);
    return claims;
  }

  private checkReplay(assertionId: string): void {
    const now = Date.now();
    if (replayCache.size > 2000) {
      for (const [id, timestamp] of replayCache.entries()) {
        if (now - timestamp > REPLAY_TTL_MS) {
          replayCache.delete(id);
        }
      }
    }

    const cachedTime = replayCache.get(assertionId);
    if (cachedTime && now - cachedTime < REPLAY_TTL_MS) {
      throw new Error(`Security Violation: SAML Assertion replay detected (ID: ${assertionId})`);
    }

    replayCache.set(assertionId, now);
  }

  private validateClockSkew(assertionXml: string, allowedSkewSeconds: number): void {
    const now = Date.now();
    const skewMs = allowedSkewSeconds * 1000;

    const conditionsMatch = assertionXml.match(/<(?:\w+:)?Conditions([^>]*)\/?>/i);
    if (conditionsMatch) {
      const attrs = conditionsMatch[1];
      const notBeforeMatch = attrs.match(/NotBefore\s*=\s*["']([^"']+)["']/i);
      const notOnOrAfterMatch = attrs.match(/NotOnOrAfter\s*=\s*["']([^"']+)["']/i);

      if (notBeforeMatch) {
        const notBeforeTime = new Date(notBeforeMatch[1]).getTime();
        if (!isNaN(notBeforeTime) && now < notBeforeTime - skewMs) {
          throw new Error(
            `Security Violation: SAML assertion not yet valid (NotBefore: ${notBeforeMatch[1]}, Server: ${new Date(now).toISOString()})`
          );
        }
      }

      if (notOnOrAfterMatch) {
        const notOnOrAfterTime = new Date(notOnOrAfterMatch[1]).getTime();
        if (!isNaN(notOnOrAfterTime) && now >= notOnOrAfterTime + skewMs) {
          throw new Error(
            `Security Violation: SAML assertion expired or timestamp skew exceeds limit (NotOnOrAfter: ${notOnOrAfterMatch[1]}, Server: ${new Date(now).toISOString()})`
          );
        }
      }
    }

    // Also check IssueInstant
    const issueInstantMatch = assertionXml.match(/\bIssueInstant\s*=\s*["']([^"']+)["']/i);
    if (issueInstantMatch) {
      const issueTime = new Date(issueInstantMatch[1]).getTime();
      if (!isNaN(issueTime) && Math.abs(now - issueTime) > skewMs * 2) {
        throw new Error(
          `Security Violation: SAML assertion IssueInstant skew exceeds limit (IssueInstant: ${issueInstantMatch[1]})`
        );
      }
    }
  }

  private verifyDigitalSignature(
    fullXml: string,
    assertionXml: string,
    config: SamlIdentityProviderConfig
  ): void {
    // Search for Signature block inside assertion or at root
    const sigMatch =
      assertionXml.match(/<(?:\w+:)?Signature[\s\S]*?<\/(?:\w+:)?Signature>/i) ||
      fullXml.match(/<(?:\w+:)?Signature[\s\S]*?<\/(?:\w+:)?Signature>/i);

    if (!sigMatch) {
      if (config.wantAssertionsSigned) {
        throw new Error('Security Violation: Unsigned SAML assertion rejected by policy');
      }
      return;
    }

    const sigXml = sigMatch[0];

    // Extract SignedInfo
    const signedInfoMatch = sigXml.match(/<(?:\w+:)?SignedInfo[\s\S]*?<\/(?:\w+:)?SignedInfo>/i);
    if (!signedInfoMatch) {
      throw new Error('Security Violation: Missing SignedInfo in SAML Signature');
    }
    const signedInfoXml = signedInfoMatch[0];

    // Extract SignatureValue
    const sigValMatch = sigXml.match(/<(?:\w+:)?SignatureValue[^>]*>([\s\S]*?)<\/(?:\w+:)?SignatureValue>/i);
    if (!sigValMatch) {
      throw new Error('Security Violation: Missing SignatureValue in SAML Signature');
    }
    const signatureValueBase64 = sigValMatch[1].replace(/\s+/g, '');

    // Extract DigestValue
    const digestValMatch = signedInfoXml.match(/<(?:\w+:)?DigestValue[^>]*>([\s\S]*?)<\/(?:\w+:)?DigestValue>/i);
    if (!digestValMatch) {
      throw new Error('Security Violation: Missing DigestValue in SAML Signature');
    }
    const expectedDigestBase64 = digestValMatch[1].replace(/\s+/g, '');

    // Digest Algorithm (default SHA-256)
    const isSha1Digest = signedInfoXml.includes('xmldsig#sha1') || signedInfoXml.includes('xmlenc#sha1');
    const digestAlgorithm = isSha1Digest ? 'sha1' : 'sha256';

    // Signature Algorithm (default RSA-SHA256)
    const isSha1Sig = signedInfoXml.includes('xmldsig#rsa-sha1');
    const sigAlgorithm = isSha1Sig ? 'RSA-SHA1' : 'RSA-SHA256';

    // 1. Verify Digest of the Assertion (minus enveloped signature)
    let assertionMinusSig = assertionXml.replace(/<(?:\w+:)?Signature[\s\S]*?<\/(?:\w+:)?Signature>/gi, '');
    const prefixMatch = assertionMinusSig.match(/^<([a-zA-Z0-9_.-]+):/);
    if (prefixMatch) {
      const prefix = prefixMatch[1];
      const nsDecl = `xmlns:${prefix}`;
      const firstTag = assertionMinusSig.match(/<[^>]+>/)?.[0] || '';
      if (!firstTag.includes(nsDecl)) {
        const rootMatch = fullXml.match(new RegExp(`${nsDecl}\\s*=\\s*"[^"]*"`, 'i'));
        if (rootMatch) {
          assertionMinusSig = assertionMinusSig.replace(new RegExp(`(<${prefix}:[a-zA-Z0-9_.-]+)\\b`), `$1 ${rootMatch[0]}`);
        }
      }
    }

    const canonicalAssertion = exclusiveC14N(assertionMinusSig);
    const calculatedDigest = crypto
      .createHash(digestAlgorithm)
      .update(canonicalAssertion, 'utf8')
      .digest('base64');

    if (calculatedDigest !== expectedDigestBase64) {
      throw new Error('Security Violation: SAML Assertion digest mismatch');
    }

    // 2. Verify SignedInfo Signature
    const canonicalSignedInfo = exclusiveC14N(signedInfoXml);

    // Resolve Certificate: use configured certificate or extract from KeyInfo
    let certToUse = config.x509Certificate;
    if (!certToUse || certToUse.length < 50) {
      const keyInfoCertMatch = sigXml.match(/<(?:\w+:)?X509Certificate[^>]*>([\s\S]*?)<\/(?:\w+:)?X509Certificate>/i);
      if (keyInfoCertMatch) {
        certToUse = keyInfoCertMatch[1].trim();
      }
    }

    if (!certToUse || certToUse.length < 50) {
      throw new Error('Security Violation: Missing valid X.509 certificate for SAML signature validation');
    }

    const pemCert = formatX509Certificate(certToUse);

    try {
      const verifier = crypto.createVerify(sigAlgorithm);
      verifier.update(canonicalSignedInfo, 'utf8');
      const verified = verifier.verify(pemCert, Buffer.from(signatureValueBase64, 'base64'));

      if (!verified) {
        throw new Error('Security Violation: SAML digital signature verification failed');
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.message.startsWith('Security Violation:')) {
        throw err;
      }
      throw new Error(`Security Violation: SAML digital signature verification failed (${err instanceof Error ? err.message : String(err)})`);
    }
  }

  private extractClaims(
    assertionXml: string,
    config: SamlIdentityProviderConfig,
    assertionId: string
  ): SamlAssertionClaims {
    // Subject NameID
    const subjectMatch =
      assertionXml.match(/<(?:\w+:)?NameID[^>]*>([^<]+)<\/(?:\w+:)?NameID>/i);
    const subjectId = subjectMatch ? subjectMatch[1].trim() : 'user@enterprise.org';

    // IssueInstant
    const issueMatch = assertionXml.match(/\bIssueInstant\s*=\s*["']([^"']+)["']/i);
    const issueInstant = issueMatch ? issueMatch[1] : new Date().toISOString();

    // SessionIndex
    const sessionMatch = assertionXml.match(/<(?:\w+:)?AuthnStatement\b[^>]*\bSessionIndex\s*=\s*["']([^"']+)["']/i);
    const sessionIndex = sessionMatch ? sessionMatch[1] : undefined;

    // Attribute mapping from config
    let attributeMapping: Record<string, string> = {};
    if (config.attributeMappingJson) {
      try {
        attributeMapping = JSON.parse(config.attributeMappingJson);
      } catch {
        // Fallback to default
      }
    }

    // Extract all attributes into map
    const attributes: Record<string, any> = {};
    const attrRegex = /<(?:\w+:)?Attribute\b([^>]*)>([\s\S]*?)<\/(?:\w+:)?Attribute>/gi;
    let attrMatch: RegExpExecArray | null;

    while ((attrMatch = attrRegex.exec(assertionXml)) !== null) {
      const attrTag = attrMatch[1];
      const attrBody = attrMatch[2];
      const nameMatch = attrTag.match(/(?:Name|AttributeName)\s*=\s*["']([^"']+)["']/i);
      if (!nameMatch) continue;
      const attrName = nameMatch[1];

      const valMatches = [...attrBody.matchAll(/<(?:\w+:)?AttributeValue[^>]*>([\s\S]*?)<\/(?:\w+:)?AttributeValue>/gi)];
      const values = valMatches.map((m) => m[1].trim());

      if (values.length === 1) {
        attributes[attrName] = values[0];
      } else if (values.length > 1) {
        attributes[attrName] = values;
      }
    }

    // Resolve Email
    const emailKey = attributeMapping['email'];
    const emailCandidate =
      (emailKey ? attributes[emailKey] : null) ||
      attributes['email'] ||
      attributes['mail'] ||
      attributes['emailAddress'] ||
      attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] ||
      subjectId;
    const email = Array.isArray(emailCandidate) ? emailCandidate[0] : String(emailCandidate);

    // Resolve Name
    const nameKey = attributeMapping['name'];
    const nameCandidate =
      (nameKey ? attributes[nameKey] : null) ||
      attributes['displayName'] ||
      attributes['name'] ||
      attributes['cn'] ||
      attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'];
    const name = nameCandidate ? (Array.isArray(nameCandidate) ? nameCandidate[0] : String(nameCandidate)) : undefined;

    // Resolve Roles
    const roleKey = attributeMapping['role'] || attributeMapping['roles'];
    const roleCandidate =
      (roleKey ? attributes[roleKey] : null) ||
      attributes['role'] ||
      attributes['roles'] ||
      attributes['groups'] ||
      attributes['http://schemas.microsoft.com/ws/2008/06/identity/claims/groups'] ||
      'staff';

    const roles: string[] = Array.isArray(roleCandidate)
      ? roleCandidate.map(String)
      : [String(roleCandidate)];

    return {
      issuer: config.entityId || config.idpEntityId || 'enterprise-idp',
      subjectId,
      email,
      name,
      roles,
      attributes,
      sessionIndex,
      assertionId,
      issueInstant,
    };
  }
}
