import { NextResponse } from 'next/server';
import { OidcService } from '@/lib/auth/oidc-service';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tenantId = url.searchParams.get('tenantId') || 'inst-001';

  const oidcService = new OidcService();
  const { codeVerifier, codeChallenge } = oidcService.generatePkce();

  const redirectUri = `${url.origin}/api/auth/oidc/callback`;
  const authUrl = oidcService.buildAuthorizationUrl(
    {
      id: 'oidc-1',
      tenantId,
      name: 'Google Workspace',
      clientId: 'enterprise-client-id',
      clientSecret: 'secret',
      issuerUrl: 'https://accounts.google.com',
      discoveryUrl: 'https://accounts.google.com/.well-known/openid-configuration',
      isActive: true,
    },
    redirectUri,
    'state_123',
    codeChallenge
  );

  const response = NextResponse.redirect(authUrl);
  response.cookies.set('oidc_verifier', codeVerifier, { httpOnly: true, path: '/' });
  return response;
}
