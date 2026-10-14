import { NextResponse } from 'next/server';
import { SamlService } from '@/lib/auth/saml-service';
import { isSsoFederationEnabled } from '@/lib/features';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const host = url.origin;
  const institutionId = url.searchParams.get('institutionId') || undefined;

  if (!isSsoFederationEnabled(institutionId)) {
    return NextResponse.json({ error: 'SSO federation is disabled' }, { status: 403 });
  }

  const samlService = new SamlService();
  const xml = samlService.generateSpMetadata(
    `${host}/api/auth/saml/metadata`,
    `${host}/api/auth/saml/acs`
  );

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/samlmetadata+xml',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
