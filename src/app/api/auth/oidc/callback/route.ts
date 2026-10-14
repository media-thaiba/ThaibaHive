import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/db';
import { staff, oidcProviders } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { OidcService } from '@/lib/auth/oidc-service';
import { FederatedUserMapper } from '@/lib/auth/federated-user-mapper';
import { SsoAuditLedger } from '@/lib/auth/sso-audit-ledger';
import { createSession } from '@/lib/auth';
import { createMobileNonce } from '@/lib/auth/mobile-nonce-service';
import { checkDistributedRateLimit, extractIp, rateLimitResponse } from '@/lib/api/rate-limit';
import { isSsoFederationEnabled } from '@/lib/features';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const ip = extractIp(request);
  const rateLimit = await checkDistributedRateLimit(`auth:oidc-callback:${ip}`, 'auth');
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.resetMs);
  }

  let institutionId = 'inst-001';

  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const stateParam = url.searchParams.get('state');

    if (!code) {
      return NextResponse.json({ error: 'Missing code parameter' }, { status: 400 });
    }

    const oidcService = new OidcService();

    // Verify HMAC-signed CSRF state token
    let statePayload: any = null;
    if (stateParam) {
      try {
        statePayload = oidcService.verifyState(stateParam);
        institutionId = statePayload.institutionId || institutionId;
      } catch (err: unknown) {
        return NextResponse.json(
          { error: err instanceof Error ? err.message : 'Invalid state token' },
          { status: 403 }
        );
      }
    }

    if (!isSsoFederationEnabled(institutionId)) {
      return NextResponse.json({ error: 'SSO federation is disabled' }, { status: 403 });
    }

    // Read PKCE code verifier cookie
    const cookieStore = await cookies();
    const codeVerifier = cookieStore.get('oidc_verifier')?.value || 'dummy_verifier';

    // Lookup provider in DB
    let provider: any = null;
    if (statePayload?.providerId) {
      provider = await db
        .select()
        .from(oidcProviders)
        .where(and(eq(oidcProviders.id, statePayload.providerId), eq(oidcProviders.isActive, true)))
        .get();
    }

    const oidcConfig = {
      id: provider?.id || statePayload?.providerId || 'oidc-default',
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

    const redirectUri = `${url.origin}/api/auth/oidc/callback`;
    const claims = await oidcService.processCallback(oidcConfig, code, codeVerifier, redirectUri);

    // Map external identity into staff user with auto-verified email
    const user = await FederatedUserMapper.mapOrCreateUser({
      tenantId: institutionId,
      institutionId,
      providerType: 'OIDC',
      providerId: provider?.id,
      externalSubjectId: claims.sub,
      email: claims.email,
      name: claims.name,
      roles: claims.roles,
    });

    // Record immutable audit log
    await SsoAuditLedger.recordEvent({
      institutionId,
      providerId: provider?.id,
      providerType: 'OIDC',
      eventType: 'login_success',
      subjectId: claims.sub,
      ipAddress: ip,
      userAgent: request.headers.get('user-agent'),
    });

    // Create session
    const staffMember = await db
      .select()
      .from(staff)
      .where(eq(staff.id, user.userId))
      .get();

    if (!staffMember) {
      return NextResponse.json({ error: 'User provisioning failed' }, { status: 500 });
    }

    const token = await createSession({
      staffId: staffMember.id,
      email: staffMember.email,
      role: staffMember.role,
      employeeId: staffMember.employeeId,
      name: `${staffMember.firstName} ${staffMember.lastName}`,
      tokenVersion: staffMember.tokenVersion ?? 0,
      institutionId,
    });

    // Handle Mobile Handoff
    if (statePayload?.returnUrl === 'mobile' || url.searchParams.get('mobile') === '1') {
      const { nonce } = await createMobileNonce({
        staffId: staffMember.id,
        email: staffMember.email,
        role: staffMember.role,
        employeeId: staffMember.employeeId,
        name: `${staffMember.firstName} ${staffMember.lastName}`,
        tokenVersion: staffMember.tokenVersion ?? 0,
        institutionId,
      });
      const res = NextResponse.redirect(`thaibahive://auth/callback?nonce=${nonce}&token=${token}`);
      res.cookies.delete('oidc_verifier');
      return res;
    }

    const redirectTarget = statePayload?.returnUrl && statePayload.returnUrl.startsWith('/')
      ? statePayload.returnUrl
      : '/dashboard';

    const response = NextResponse.redirect(new URL(redirectTarget, request.url));
    response.cookies.delete('oidc_verifier');
    return response;
  } catch (err: unknown) {
    console.error('[OIDC Callback Error]:', err instanceof Error ? err.stack : err);

    await SsoAuditLedger.recordEvent({
      institutionId,
      providerType: 'OIDC',
      eventType: 'login_failure',
      subjectId: 'anonymous',
      ipAddress: ip,
      userAgent: request.headers.get('user-agent'),
    }).catch(() => {});

    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'OIDC callback processing failed' },
      { status: 400 }
    );
  }
}
