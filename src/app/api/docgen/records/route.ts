import { resolveRequestInstitution } from "@/lib/api/auth-guard";
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { DocDbStore } from '@/lib/db/docgen-store';

export const GET = requireAuth(async (request, session) => {
  const url = new URL(request.url);
  const institutionId = await resolveRequestInstitution(session, url.searchParams.get("institutionId"));
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
