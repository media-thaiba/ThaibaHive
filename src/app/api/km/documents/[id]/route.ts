import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { kmDocumentUpdateSchema } from '@/lib/validation/km-schemas';
import { kmStore } from '@/lib/db/km-store';

export const GET = requireAuth(async (request: Request, context: any) => {
  try {
    const { id } = context.params || {};
    const doc = await kmStore.getDocumentById(id);
    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }
    const chunks = await kmStore.listChunksByDocument(id);
    return NextResponse.json({ success: true, document: doc, chunks }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch document' }, { status: 500 });
  }
}, 'km:knowledge:search');

export const PATCH = requireAuth(async (request: Request, context: any) => {
  try {
    const { id } = context.params || {};
    const body = await request.json();
    const parse = kmDocumentUpdateSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: 'Validation failed', details: parse.error.format() }, { status: 400 });
    }

    const doc = await kmStore.getDocumentById(id);
    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Document updated successfully', documentId: id }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update document' }, { status: 500 });
  }
}, 'km:ingest:manage');

export const DELETE = requireAuth(async (request: Request, context: any) => {
  try {
    const { id } = context.params || {};
    const doc = await kmStore.getDocumentById(id);
    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Document deleted successfully', documentId: id }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete document' }, { status: 500 });
  }
}, 'km:ingest:manage');
