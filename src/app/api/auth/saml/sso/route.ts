import { NextResponse } from 'next/server';
import { SamlService } from '@/lib/auth/saml-service';
import crypto from 'crypto';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const ssoUrl = url.searchParams.get('ssoUrl') || 'https://idp.enterprise.org/saml2/sso';
  const tenantId = url.searchParams.get('tenantId') || 'inst-001';

  const samlService = new SamlService();
  const { redirectUrl } = samlService.generateAuthnRequest(
    {
      id: 'provider-1',
      tenantId,
      name: 'Enterprise IdP',
      idpEntityId: 'https://idp.enterprise.org',
      ssoUrl,
      x509Certificate: 'MII...',
      isActive: true,
    },
    {
      spEntityId: `${url.origin}/api/auth/saml/metadata`,
      acsUrl: `${url.origin}/api/auth/saml/acs`,
      requestId: `req_${crypto.randomUUID()}`,
      issueInstant: new Date().toISOString(),
    }
  );

  return NextResponse.redirect(redirectUrl);
}
