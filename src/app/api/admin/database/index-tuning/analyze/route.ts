import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { IndexAnalyzer } from '@/lib/database/index-analyzer';
import { db } from '@/db';
import { indexTuningRecommendations } from '@/db/schema';
import crypto from 'crypto';

export const GET = requireAuth(async () => {
  try {
    const analyzer = new IndexAnalyzer();
    const mockScanStats = [
      { tableName: 'students', seqScans: 1500, idxScans: 50, totalRows: 50000 },
      { tableName: 'attendance_logs', seqScans: 4200, idxScans: 100, totalRows: 250000 },
    ];

    const recommendations = analyzer.analyzeTableStats(mockScanStats);

    // Save recommendations
    for (const rec of recommendations) {
      await db.insert(indexTuningRecommendations).values({
        id: rec.id || `rec_${crypto.randomUUID()}`,
        tableName: rec.tableName,
        recommendedIndexName: rec.recommendedIndexName,
        indexDdl: rec.indexDdl,
        seqScans: rec.seqScans,
        estTimeSavingsMs: rec.estTimeSavingsMs,
        riskLevel: rec.riskLevel,
        status: rec.status,
        createdAt: rec.createdAt,
      });
    }

    return NextResponse.json({ recommendations });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Analysis failed' }, { status: 500 });
  }
}, 'database:admin');
