import { NextResponse } from 'next/server';
import { db } from '@/db';
import { staff, samlProviders } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { SamlService } from '@/lib/auth/saml-service';
import { FederatedUserMapper } from '@/lib/auth/federated-user-mapper';
import { SsoAuditLedger } from '@/lib/auth/sso-audit-ledger';
import { createSession } from '@/lib/auth';
import { createMobileNonce } from '@/lib/auth/mobile-nonce-service';
import { checkDistributedRateLimit, extractIp, rateLimitResponse } from '@/lib/api/rate-limit';
import { isSsoFederationEnabled } from '@/lib/features';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const ip = extractIp(request);
  const rateLimit = await checkDistributedRateLimit(`auth:saml-acs:${ip}`, 'auth');
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.resetMs);
  }

  let institutionId = 'inst-001';

  try {
    const formData = await request.formData();
    const samlResponse = formData.get('SAMLResponse') as string;
    const relayState = (formData.get('RelayState') as string) || '';

    if (!samlResponse) {
      return NextResponse.json({ error: 'Missing SAMLResponse payload' }, { status: 400 });
    }

    // Inspect Issuer from unverified XML payload for provider resolution
    let issuer = '';
    try {
      const rawXml = Buffer.from(samlResponse, 'base64').toString('utf-8');
      const issuerMatch = rawXml.match(/<(?:\w+:)?Issuer[^>]*>([^<]+)<\/(?:\w+:)?Issuer>/i);
      if (issuerMatch) {
        issuer = issuerMatch[1].trim();
      }
    } catch {
      // Fallback
    }

    // Lookup provider in DB
    let provider: any = null;
    if (issuer) {
      provider = await db
        .select()
        .from(samlProviders)
        .where(and(eq(samlProviders.idpEntityId, issuer), eq(samlProviders.isActive, true)))
        .get();
    }

    if (provider) {
      institutionId = provider.institutionId;
    }

    if (!isSsoFederationEnabled(institutionId)) {
      return NextResponse.json({ error: 'SSO federation is disabled for this tenant' }, { status: 403 });
    }

    const providerConfig = {
      id: provider?.id || 'provider-default',
      institutionId,
      name: provider?.name || 'Enterprise IdP',
      entityId: provider?.idpEntityId || issuer || 'https://idp.enterprise.org',
      ssoUrl: provider?.ssoUrl || 'https://idp.enterprise.org/sso',
      x509Certificate: provider?.x509Certificate || '',
      binding: provider?.binding || 'HTTP-POST',
      wantAssertionsSigned: provider?.wantAssertionsSigned ?? false,
      attributeMappingJson: provider?.attributeMappingJson || null,
      isActive: true,
    };

    const samlService = new SamlService();
    const claims = samlService.parseAndValidateResponse(samlResponse, providerConfig);

    // Map external identity into staff user with auto-verified email
    const user = await FederatedUserMapper.mapOrCreateUser({
      tenantId: institutionId,
      institutionId,
      providerType: 'SAML',
      providerId: provider?.id,
      externalSubjectId: claims.subjectId,
      email: claims.email,
      name: claims.name,
      roles: claims.roles,
      attributes: claims.attributes,
    });

    // Record immutable audit log
    await SsoAuditLedger.recordEvent({
      institutionId,
      providerId: provider?.id,
      providerType: 'SAML',
      eventType: 'login_success',
      subjectId: claims.subjectId,
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
    if (relayState === 'mobile' || new URL(request.url).searchParams.get('mobile') === '1') {
      const { nonce } = await createMobileNonce({
        staffId: staffMember.id,
        email: staffMember.email,
        role: staffMember.role,
        employeeId: staffMember.employeeId,
        name: `${staffMember.firstName} ${staffMember.lastName}`,
        tokenVersion: staffMember.tokenVersion ?? 0,
        institutionId,
      });
      return NextResponse.redirect(`thaibahive://auth/callback?nonce=${nonce}&token=${token}`);
    }

    const redirectTarget = relayState && relayState.startsWith('/') ? relayState : '/dashboard';
    return NextResponse.redirect(new URL(redirectTarget, request.url));
  } catch (err: unknown) {
    console.error('[SAML ACS Error]:', err instanceof Error ? err.stack : err);

    await SsoAuditLedger.recordEvent({
      institutionId,
      providerType: 'SAML',
      eventType: 'login_failure',
      subjectId: 'anonymous',
      ipAddress: ip,
      userAgent: request.headers.get('user-agent'),
    }).catch(() => {});

    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'SAML authentication failed' },
      { status: 400 }
    );
  }
}
