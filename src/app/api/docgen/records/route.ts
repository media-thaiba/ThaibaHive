import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { DocDbStore } from '@/lib/db/docgen-store';

export const GET = requireAuth(async (request) => {
  const url = new URL(request.url);
  const institutionId = url.searchParams.get('institutionId') || 'global';
  const recipientId = url.searchParams.get('recipientId') || undefined;
  const documentType = (url.searchParams.get('documentType') as any) || undefined;
  const status = (url.searchParams.get('status') as any) || undefined;

  const store = DocDbStore.getInstance();
  const records = await store.listGeneratedRecords(institutionId, {
    recipientId,
    documentType,
    status,
  });

  return NextResponse.json({ success: true, records });
}, 'documents:read');
