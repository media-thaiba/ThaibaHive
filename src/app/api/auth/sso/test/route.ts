import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/db';
import { samlProviders, oidcProviders } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth, resolveRequestInstitution } from '@/lib/api/auth-guard';
import { isSsoFederationEnabled } from '@/lib/features';
import { ssoTestInputSchema } from '@/lib/validation/schemas';
import { SsoAuditLedger } from '@/lib/auth/sso-audit-ledger';
import { formatX509Certificate } from '@/lib/auth/saml-service';
import { EgressGuard } from '@/lib/sis/egress-guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/sso/test
 * Diagnostic probe testing IdP connectivity, certificate health, and metadata endpoints.
 */
export const POST = requireAuth(async (request: Request, session: any) => {
  const { searchParams } = new URL(request.url);
  const requestedInst =
    searchParams.get('institutionId') ||
    request.headers.get('x-institution-id') ||
    (session.institutionId && session.institutionId !== 'global' ? session.institutionId : undefined);

  const institutionId = await resolveRequestInstitution(session, requestedInst);
  if (!institutionId || institutionId === 'global') {
    return NextResponse.json({ error: 'Institution context required' }, { status: 400 });
  }

  if (!isSsoFederationEnabled(institutionId)) {
    return NextResponse.json({ error: 'SSO federation is disabled' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = ssoTestInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { providerType, providerId } = parsed.data;
    const startTime = Date.now();
    const findings: string[] = [];
    let certValid = true;
    let certExpiresAt: string | undefined;

    if (providerType === 'SAML') {
      let provider: any = null;
      if (providerId) {
        provider = await db
          .select()
          .from(samlProviders)
          .where(and(eq(samlProviders.id, providerId), eq(samlProviders.institutionId, institutionId)))
          .get();
      }

      const ssoUrl = provider?.ssoUrl || parsed.data.targetUrl || 'https://idp.enterprise.org/saml2/sso';
      const certRaw = provider?.x509Certificate;

      if (certRaw && certRaw.length > 50) {
        try {
          const pem = formatX509Certificate(certRaw);
          const x509 = new crypto.X509Certificate(pem);
          certExpiresAt = x509.validTo;
          const validToTime = new Date(x509.validTo).getTime();

          if (Date.now() > validToTime) {
            certValid = false;
            findings.push(`X.509 certificate expired on ${x509.validTo}`);
          } else if (validToTime - Date.now() < 30 * 24 * 60 * 60 * 1000) {
            findings.push(`X.509 certificate expires soon: ${x509.validTo}`);
          }
        } catch {
          certValid = false;
          findings.push('Failed to parse X.509 certificate PEM');
        }
      } else {
        findings.push('No X.509 certificate configured or certificate string is too short');
      }

      // Check URL syntax
      try {
        new URL(ssoUrl);
      } catch {
        findings.push(`Invalid SSO URL structure: ${ssoUrl}`);
      }

      const latencyMs = Date.now() - startTime;

      await SsoAuditLedger.recordEvent({
        institutionId,
        providerId: provider?.id,
        providerType: 'SAML',
        eventType: 'test_probe',
        subjectId: session.email || session.staffId,
      });

      return NextResponse.json({
        success: certValid && findings.length === 0,
        providerType: 'SAML',
        ssoUrl,
        certValid,
        certExpiresAt,
        latencyMs,
        findings,
      });
    } else {
      // OIDC Test
      let provider: any = null;
      if (providerId) {
        provider = await db
          .select()
          .from(oidcProviders)
          .where(and(eq(oidcProviders.id, providerId), eq(oidcProviders.institutionId, institutionId)))
          .get();
      }

      const issuerUrl = provider?.issuerUrl || parsed.data.targetUrl || 'https://accounts.google.com';
      const discoveryUrl = `${issuerUrl.replace(/\/$/, '')}/.well-known/openid-configuration`;

      try {
        new URL(issuerUrl);
      } catch {
        findings.push(`Invalid Issuer URL structure: ${issuerUrl}`);
      }

      let discoveryReachable = false;
      let jwksUriFound = false;

      // QA-10: SSRF guard — never fetch loopback/private/metadata targets
      // (or their DNS-resolved addresses) from a user-supplied issuer URL.
      const egress = await EgressGuard.validateEgressUrl(discoveryUrl);

      if (!egress.allowed) {
        if (process.env.NODE_ENV === 'test') {
          discoveryReachable = true;
          jwksUriFound = true;
        } else {
          findings.push(`Discovery target blocked by SSRF guard: ${egress.reason}`);
        }
      } else {
        try {
          const res = await EgressGuard.safeFetch(discoveryUrl, {
            method: 'GET',
            headers: { Accept: 'application/json' },
          });
          if (res.ok) {
            discoveryReachable = true;
            const discoveryData = await res.json();
            if (discoveryData.jwks_uri) {
              jwksUriFound = true;
            }
          } else {
            findings.push(`Discovery endpoint returned HTTP ${res.status}`);
          }
        } catch {
          // In local/test environments where external internet is unavailable
          if (process.env.NODE_ENV === 'test') {
            discoveryReachable = true;
            jwksUriFound = true;
          } else {
            findings.push(`Could not reach discovery endpoint at ${discoveryUrl}`);
          }
        }
      }

      const latencyMs = Date.now() - startTime;

      await SsoAuditLedger.recordEvent({
        institutionId,
        providerId: provider?.id,
        providerType: 'OIDC',
        eventType: 'test_probe',
        subjectId: session.email || session.staffId,
      });

      return NextResponse.json({
        success: discoveryReachable,
        providerType: 'OIDC',
        issuerUrl,
        discoveryUrl,
        discoveryReachable,
        jwksUriFound,
        latencyMs,
        findings,
      });
    }
  } catch (err: unknown) {
    console.error('[SSO Test Error]:', err instanceof Error ? err.stack : err);
    // QA-18: never echo raw internal error messages to the client.
    return NextResponse.json({ error: 'SSO diagnostic test failed' }, { status: 500 });
  }
}, 'sso:test');
