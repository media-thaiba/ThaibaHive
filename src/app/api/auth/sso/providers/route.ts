import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/db';
import { samlProviders, oidcProviders } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { requireAuth, resolveRequestInstitution } from '@/lib/api/auth-guard';
import { isSsoFederationEnabled } from '@/lib/features';
import { samlProviderInputSchema, oidcProviderInputSchema } from '@/lib/validation/schemas';
import { SsoAuditLedger } from '@/lib/auth/sso-audit-ledger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/sso/providers
 * Returns configured SAML and OIDC IdPs for the institution.
 */
export const GET = requireAuth(async (request: Request, session: any) => {
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
    const samlList = await db
      .select({
        id: samlProviders.id,
        institutionId: samlProviders.institutionId,
        name: samlProviders.name,
        idpEntityId: samlProviders.idpEntityId,
        ssoUrl: samlProviders.ssoUrl,
        sloUrl: samlProviders.sloUrl,
        certExpiresAt: samlProviders.certExpiresAt,
        binding: samlProviders.binding,
        wantAssertionsSigned: samlProviders.wantAssertionsSigned,
        isActive: samlProviders.isActive,
        createdAt: samlProviders.createdAt,
        updatedAt: samlProviders.updatedAt,
      })
      .from(samlProviders)
      .where(eq(samlProviders.institutionId, institutionId))
      .orderBy(desc(samlProviders.createdAt));

    const oidcList = await db
      .select({
        id: oidcProviders.id,
        institutionId: oidcProviders.institutionId,
        name: oidcProviders.name,
        clientId: oidcProviders.clientId,
        issuerUrl: oidcProviders.issuerUrl,
        discoveryUrl: oidcProviders.discoveryUrl,
        authorizationEndpoint: oidcProviders.authorizationEndpoint,
        tokenEndpoint: oidcProviders.tokenEndpoint,
        userinfoEndpoint: oidcProviders.userinfoEndpoint,
        jwksUri: oidcProviders.jwksUri,
        scopes: oidcProviders.scopes,
        cacheExpiresAt: oidcProviders.cacheExpiresAt,
        isActive: oidcProviders.isActive,
        createdAt: oidcProviders.createdAt,
        updatedAt: oidcProviders.updatedAt,
      })
      .from(oidcProviders)
      .where(eq(oidcProviders.institutionId, institutionId))
      .orderBy(desc(oidcProviders.createdAt));

    return NextResponse.json({
      samlProviders: samlList,
      oidcProviders: oidcList,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to list SSO providers' },
      { status: 500 }
    );
  }
}, 'sso:read');

/**
 * POST /api/auth/sso/providers
 * Creates a new SAML or OIDC IdP configuration.
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
    const type = body.type;

    if (type === 'SAML') {
      const parsed = samlProviderInputSchema.safeParse(body.data || body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
      }

      const input = parsed.data;
      const providerId = `saml_${crypto.randomUUID()}`;
      const now = new Date().toISOString();

      await db.insert(samlProviders).values({
        id: providerId,
        tenantId: institutionId,
        institutionId,
        name: input.name,
        idpEntityId: input.entityId,
        ssoUrl: input.ssoUrl,
        x509Certificate: input.x509Certificate,
        binding: input.binding,
        wantAssertionsSigned: input.wantAssertionsSigned,
        attributeMappingJson: input.attributeMappingJson || null,
        isActive: input.isActive,
        createdAt: now,
        updatedAt: now,
      });

      await SsoAuditLedger.recordEvent({
        institutionId,
        providerId,
        providerType: 'SAML',
        eventType: 'idp_created',
        subjectId: session.email || session.staffId,
      });

      return NextResponse.json({ success: true, id: providerId }, { status: 201 });
    } else if (type === 'OIDC') {
      const parsed = oidcProviderInputSchema.safeParse(body.data || body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
      }

      const input = parsed.data;
      const providerId = `oidc_${crypto.randomUUID()}`;
      const now = new Date().toISOString();

      await db.insert(oidcProviders).values({
        id: providerId,
        tenantId: institutionId,
        institutionId,
        name: input.name,
        clientId: input.clientId,
        clientSecret: input.clientSecret,
        issuerUrl: input.issuerUrl,
        discoveryUrl: `${input.issuerUrl.replace(/\/$/, '')}/.well-known/openid-configuration`,
        authorizationEndpoint: input.authorizationEndpoint || null,
        tokenEndpoint: input.tokenEndpoint || null,
        userinfoEndpoint: input.userinfoEndpoint || null,
        jwksUri: input.jwksUri || null,
        scopes: input.scopes,
        isActive: input.isActive,
        createdAt: now,
        updatedAt: now,
      });

      await SsoAuditLedger.recordEvent({
        institutionId,
        providerId,
        providerType: 'OIDC',
        eventType: 'idp_created',
        subjectId: session.email || session.staffId,
      });

      return NextResponse.json({ success: true, id: providerId }, { status: 201 });
    } else {
      return NextResponse.json({ error: "Invalid provider type. Must be 'SAML' or 'OIDC'" }, { status: 400 });
    }
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create SSO provider' },
      { status: 500 }
    );
  }
}, 'sso:manage');
