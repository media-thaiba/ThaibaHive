import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { kmSearchSchema } from '@/lib/validation/km-schemas';
import { hybridFusionEngine } from '@/lib/operations/km/retrieval/hybrid-fusion-engine';
import { kmAuditLogger } from '@/lib/operations/km/governance/km-audit-logger';
import { kmTelemetry } from '@/lib/operations/km/km-telemetry';

export const POST = requireAuth(async (request: Request, user: any) => {
  try {
    const body = await request.json();
    const parse = kmSearchSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: 'Validation failed', details: parse.error.format() }, { status: 400 });
    }

    const { query, topK, category, enableReranking, institutionId } = parse.data;
    const start = Date.now();

    const results = await hybridFusionEngine.search(query, {
      topK,
      category,
      enableReranking,
      institutionId,
    });

    const latencySec = (Date.now() - start) / 1000;
    kmTelemetry.trackQuery('search', 'success', latencySec, institutionId);
    kmAuditLogger.logEvent('query', user?.id || 'anonymous', { query, hits: results.length }, institutionId);

    return NextResponse.json({ success: true, query, totalHits: results.length, results }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Search execution failed' }, { status: 500 });
  }
}, 'km:knowledge:search');
