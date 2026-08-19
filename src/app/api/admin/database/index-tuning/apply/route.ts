import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { IndexAutoTuner } from '@/lib/database/index-auto-tuner';
import { db } from '@/db';
import { indexTuningRecommendations } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const POST = requireAuth(async (request: Request) => {
  try {
    const body = await request.json();
    const { recommendationId } = body;

    if (!recommendationId) {
      return NextResponse.json({ error: 'recommendationId is required' }, { status: 400 });
    }

    const [rec] = await db.select().from(indexTuningRecommendations).where(eq(indexTuningRecommendations.id, recommendationId));

    if (!rec) {
      return NextResponse.json({ error: 'Recommendation not found' }, { status: 404 });
    }

    const tuner = new IndexAutoTuner();
    const result = await tuner.executeIndexRecommendation({
      id: rec.id,
      tableName: rec.tableName,
      recommendedIndexName: rec.recommendedIndexName,
      indexDdl: rec.indexDdl,
      seqScans: rec.seqScans,
      estTimeSavingsMs: rec.estTimeSavingsMs,
      riskLevel: rec.riskLevel as any,
      status: rec.status as any,
      createdAt: rec.createdAt,
    });

    return NextResponse.json({ result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Apply index recommendation failed' }, { status: 500 });
  }
}, 'database:admin');
