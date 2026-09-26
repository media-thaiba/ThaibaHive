import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { kmDocumentIngestSchema } from '@/lib/validation/km-schemas';
import { meshSyncOrchestrator } from '@/lib/operations/km/ingestion/mesh-sync-orchestrator';
import { kmStore } from '@/lib/db/km-store';

export const GET = requireAuth(async (_request: Request) => {
  try {
    const docs = await kmStore.listDocuments('global');
    return NextResponse.json({ success: true, total: docs.length, documents: docs }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to list documents' }, { status: 500 });
  }
}, 'km:knowledge:search');

export const POST = requireAuth(async (request: Request) => {
  try {
    const body = await request.json();
    const parse = kmDocumentIngestSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: 'Validation failed', details: parse.error.format() }, { status: 400 });
    }

    const data = parse.data;
    const result = await meshSyncOrchestrator.ingestDocument(data.rawText, {
      documentId: data.documentId,
      title: data.title,
      category: data.category,
      fileType: data.fileType,
      metadata: data.metadata,
      institutionId: data.institutionId,
    });

    return NextResponse.json({ success: true, result }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to ingest document' }, { status: 500 });
  }
}, 'km:ingest:manage');
