import { NextResponse } from 'next/server';
import { db } from '@/db';
import { oidcProviders } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { OidcService } from '@/lib/auth/oidc-service';
import { checkDistributedRateLimit, extractIp, rateLimitResponse } from '@/lib/api/rate-limit';
import { isSsoFederationEnabled } from '@/lib/features';
import { isSafeInternalPath } from '@/lib/security/safe-redirect';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const ip = extractIp(request);
  const rl = await checkDistributedRateLimit(`auth:oidc-login:${ip}`, 'auth');
  if (!rl.allowed) {
    return rateLimitResponse(rl.resetMs);
  }

  const url = new URL(request.url);
  const institutionId = url.searchParams.get('institutionId') || 'inst-001';
  const providerId = url.searchParams.get('providerId');

  if (!isSsoFederationEnabled(institutionId)) {
    return NextResponse.json({ error: 'SSO federation is disabled' }, { status: 403 });
  }

  let provider: any = null;
  if (providerId) {
    provider = await db
      .select()
      .from(oidcProviders)
      .where(and(eq(oidcProviders.id, providerId), eq(oidcProviders.isActive, true)))
      .get();
  } else {
    provider = await db
      .select()
      .from(oidcProviders)
      .where(and(eq(oidcProviders.institutionId, institutionId), eq(oidcProviders.isActive, true)))
      .get();
  }

  const oidcConfig = {
    id: provider?.id || 'oidc-default',
    institutionId,
    name: provider?.name || 'Google Workspace',
    clientId: provider?.clientId || 'enterprise-client-id',
    clientSecret: provider?.clientSecret || 'secret',
    issuerUrl: provider?.issuerUrl || 'https://accounts.google.com',
    discoveryUrl: provider?.discoveryUrl || 'https://accounts.google.com/.well-known/openid-configuration',
    authorizationEndpoint: provider?.authorizationEndpoint,
    tokenEndpoint: provider?.tokenEndpoint,
    userinfoEndpoint: provider?.userinfoEndpoint,
    jwksUri: provider?.jwksUri,
    scopes: provider?.scopes || 'openid profile email roles',
    isActive: true,
  };

  const oidcService = new OidcService();
  const { codeVerifier, codeChallenge } = oidcService.generatePkce();

  // QA-11: only carry same-site path return targets through the state token.
  const rawReturnUrl = url.searchParams.get('returnUrl');
  const state = oidcService.generateState({
    institutionId,
    providerId: oidcConfig.id,
    returnUrl: isSafeInternalPath(rawReturnUrl) ? rawReturnUrl : undefined,
  });

  const redirectUri = `${url.origin}/api/auth/oidc/callback`;
  const authUrl = oidcService.buildAuthorizationUrl(oidcConfig, redirectUri, state, codeChallenge);

  const response = NextResponse.redirect(authUrl);
  response.cookies.set('oidc_verifier', codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth/oidc/callback',
    maxAge: 15 * 60, // 15 minutes
  });

  return response;
}
