import { NextResponse } from 'next/server';
import { SamlService } from '@/lib/auth/saml-service';
import { FederatedUserMapper } from '@/lib/auth/federated-user-mapper';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const samlResponse = formData.get('SAMLResponse') as string;

    if (!samlResponse) {
      return NextResponse.json({ error: 'Missing SAMLResponse payload' }, { status: 400 });
    }

    const samlService = new SamlService();
    const claims = samlService.parseAndValidateResponse(samlResponse, {
      id: 'provider-1',
      tenantId: 'inst-001',
      name: 'Enterprise IdP',
      idpEntityId: 'https://idp.enterprise.org',
      ssoUrl: 'https://idp.enterprise.org/sso',
      x509Certificate: 'MII...',
      isActive: true,
    });

    const user = await FederatedUserMapper.mapOrCreateUser({
      tenantId: 'inst-001',
      providerType: 'SAML',
      externalSubjectId: claims.subjectId,
      email: claims.email,
      roles: claims.roles,
      attributes: claims.attributes,
    });

    const response = NextResponse.redirect(new URL('/dashboard', request.url));
    response.cookies.set('auth_token', `fed_token_${user.userId}`, { httpOnly: true, path: '/' });
    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'SAML authentication failed' }, { status: 400 });
  }
}
