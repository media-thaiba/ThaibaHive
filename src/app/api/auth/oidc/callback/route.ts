import { NextResponse } from 'next/server';
import { OidcService } from '@/lib/auth/oidc-service';
import { FederatedUserMapper } from '@/lib/auth/federated-user-mapper';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');

    if (!code) {
      return NextResponse.json({ error: 'Missing code parameter' }, { status: 400 });
    }

    const oidcService = new OidcService();
    const claims = await oidcService.processCallback(
      {
        id: 'oidc-1',
        tenantId: 'inst-001',
        name: 'Google Workspace',
        clientId: 'enterprise-client-id',
        clientSecret: 'secret',
        issuerUrl: 'https://accounts.google.com',
        discoveryUrl: 'https://accounts.google.com/.well-known/openid-configuration',
        isActive: true,
      },
      code,
      'verifier_dummy'
    );

    const user = await FederatedUserMapper.mapOrCreateUser({
      tenantId: 'inst-001',
      providerType: 'OIDC',
      externalSubjectId: claims.sub,
      email: claims.email,
      name: claims.name,
      roles: claims.roles,
    });

    const response = NextResponse.redirect(new URL('/dashboard', request.url));
    response.cookies.set('auth_token', `fed_token_${user.userId}`, { httpOnly: true, path: '/' });
    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'OIDC callback processing failed' }, { status: 400 });
  }
}
