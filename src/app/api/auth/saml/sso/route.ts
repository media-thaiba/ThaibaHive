import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/db';
import { samlProviders } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { SamlService } from '@/lib/auth/saml-service';
import { checkDistributedRateLimit, extractIp, rateLimitResponse } from '@/lib/api/rate-limit';
import { isSsoFederationEnabled } from '@/lib/features';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const ip = extractIp(request);
  const rl = await checkDistributedRateLimit(`auth:saml-sso:${ip}`, 'auth');
  if (!rl.allowed) {
    return rateLimitResponse(rl.resetMs);
  }

  const url = new URL(request.url);
  const institutionId = url.searchParams.get('institutionId') || 'inst-001';
  const providerId = url.searchParams.get('providerId');

  if (!isSsoFederationEnabled(institutionId)) {
    return NextResponse.json({ error: 'SSO federation is disabled' }, { status: 403 });
  }

  // Look up configured IdP
  let provider: any = null;
  if (providerId) {
    provider = await db
      .select()
      .from(samlProviders)
      .where(and(eq(samlProviders.id, providerId), eq(samlProviders.isActive, true)))
      .get();
  } else {
    provider = await db
      .select()
      .from(samlProviders)
      .where(and(eq(samlProviders.institutionId, institutionId), eq(samlProviders.isActive, true)))
      .get();
  }

  // QA-11: never fall back to a caller-supplied `ssoUrl` query param — that
  // was an unauthenticated open redirect. Only configured IdP URLs are used.
  if (!provider) {
    return NextResponse.json(
      { error: 'No active SAML identity provider configured' },
      { status: 404 }
    );
  }

  const ssoUrl = provider.ssoUrl;
  const idpEntityId = provider.idpEntityId;

  const samlService = new SamlService();
  const requestId = `req_${crypto.randomUUID()}`;
  const issueInstant = new Date().toISOString();

  const { redirectUrl } = samlService.generateAuthnRequest(
    {
      id: provider.id,
      institutionId,
      name: provider.name,
      entityId: idpEntityId,
      ssoUrl,
      x509Certificate: provider.x509Certificate || '',
      isActive: true,
    },
    {
      spEntityId: `${url.origin}/api/auth/saml/metadata`,
      acsUrl: `${url.origin}/api/auth/saml/acs`,
      requestId,
      issueInstant,
      relayState: url.searchParams.get('relayState') || undefined,
    }
  );

  return NextResponse.redirect(redirectUrl);
}
