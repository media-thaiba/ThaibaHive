import { NextResponse } from 'next/server';
import { withPublicApm } from '@/lib/api/public-apm';
import { VerificationResolver } from '@/lib/operations/docgen/crypto/verification-resolver';

export const GET = withPublicApm(async (req: Request, { params }: { params: Promise<{ docHash: string }> }) => {
  try {
    const { docHash } = await params;
    if (!docHash || docHash.trim().length === 0) {
      return NextResponse.json({ error: 'Document hash is required' }, { status: 400 });
    }

    const resolver = VerificationResolver.getInstance();
    const result = await resolver.resolve(docHash);

    if (result.status === 'NOT_FOUND') {
      return NextResponse.json({ error: result.authenticityMessage, result }, { status: 404 });
    }

    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
});
