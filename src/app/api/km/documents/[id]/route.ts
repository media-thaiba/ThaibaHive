import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { kmDocumentUpdateSchema } from '@/lib/validation/km-schemas';
import { kmStore } from '@/lib/db/km-store';

export const GET = requireAuth(async (request: Request, session, context?: any) => {
  try {
    const params = await context?.params;
    const { id } = params || {};
    if (!id) return NextResponse.json({ error: 'Document ID required' }, { status: 400 });
    const instScope = session.institutionId && session.institutionId !== 'global' ? session.institutionId : undefined;
    const doc = await kmStore.getDocumentById(id, instScope);
    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }
    const chunks = await kmStore.listChunksByDocument(id, instScope);
    return NextResponse.json({ success: true, document: doc, chunks }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch document' }, { status: 500 });
  }
}, 'km:knowledge:search');

export const PATCH = requireAuth(async (request: Request, session, context?: any) => {
  try {
    const params = await context?.params;
    const { id } = params || {};
    if (!id) return NextResponse.json({ error: 'Document ID required' }, { status: 400 });
    const body = await request.json();
    const parse = kmDocumentUpdateSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: 'Validation failed', details: parse.error.format() }, { status: 400 });
    }

    const instScope = session.institutionId && session.institutionId !== 'global' ? session.institutionId : undefined;
    const doc = await kmStore.getDocumentById(id, instScope);
    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    await kmStore.createDocument({
      ...doc,
      ...(parse.data.title !== undefined ? { title: parse.data.title } : {}),
      ...(parse.data.category !== undefined ? { category: parse.data.category } : {}),
      ...(parse.data.status !== undefined ? { status: parse.data.status } : {}),
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, message: 'Document updated successfully', documentId: id }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update document' }, { status: 500 });
  }
}, 'km:ingest:manage');

export const DELETE = requireAuth(async (request: Request, session, context?: any) => {
  try {
    const params = await context?.params;
    const { id } = params || {};
    if (!id) return NextResponse.json({ error: 'Document ID required' }, { status: 400 });
    const instScope = session.institutionId && session.institutionId !== 'global' ? session.institutionId : undefined;
    const doc = await kmStore.getDocumentById(id, instScope);
    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    await kmStore.updateDocumentStatus(id, 'archived', 0, instScope);

    return NextResponse.json({ success: true, message: 'Document deleted successfully', documentId: id }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete document' }, { status: 500 });
  }
}, 'km:ingest:manage');
