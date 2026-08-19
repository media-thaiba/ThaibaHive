import { NextResponse } from 'next/server';
import { SamlService } from '@/lib/auth/saml-service';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const host = url.origin;
  const samlService = new SamlService();

  const xml = samlService.generateSpMetadata(`${host}/api/auth/saml/metadata`, `${host}/api/auth/saml/acs`);

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml',
    },
  });
}
