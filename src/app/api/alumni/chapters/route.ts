import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { chapterEngine } from '@/lib/operations/alumni/chapters/chapter-engine';
import { alumniStore } from '@/db/alumni-store';
import { createChapterSchema } from '@/lib/validation/alumni-schemas';

export const GET = requireAuth(async (request) => {
  const url = new URL(request.url);
  const institutionId = url.searchParams.get('institutionId') || 'global';
  const chapterId = url.searchParams.get('id');

  if (chapterId) {
    const chapter = await alumniStore.getChapterById(chapterId, institutionId);
    if (!chapter) {
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, chapter });
  }

  const list = await alumniStore.listChapters(institutionId);
  return NextResponse.json({ success: true, chapters: list });
}, 'alumni:chapters:view');

export const POST = requireAuth(async (request) => {
  try {
    const body = await request.json();
    const action = body.action || 'create';

    if (action === 'create') {
      const parsed = createChapterSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
      }
      const chapter = await chapterEngine.createChapter(parsed.data);
      return NextResponse.json({ success: true, chapter }, { status: 201 });
    }

    if (action === 'join') {
      const { chapterId, alumniProfileId, role } = body;
      if (!chapterId || !alumniProfileId) {
        return NextResponse.json({ error: 'chapterId and alumniProfileId required' }, { status: 400 });
      }
      const member = await chapterEngine.joinChapter(chapterId, alumniProfileId, role || 'member');
      return NextResponse.json({ success: true, member }, { status: 201 });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Chapter operation failed' }, { status: 500 });
  }
}, 'alumni:chapters:manage');
