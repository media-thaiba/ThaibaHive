import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { EtlEngine } from '@/lib/lakehouse/etl-engine';
import { SchemaManager } from '@/lib/lakehouse/schema-manager';
import { db } from '@/db';
import { dataLakehouseJobs } from '@/db/schema';
import crypto from 'crypto';

export const POST = requireAuth(async (request: Request, session) => {
  try {
    const body = await request.json();
    const { domain, tenantId, lastWatermark } = body;

    if (!domain) {
      return NextResponse.json({ error: 'Domain is required for lakehouse export' }, { status: 400 });
    }

    const targetTenantId = tenantId || (session as any).institutionId || 'inst-001';
    const schema = SchemaManager.getSchema(domain);
    const jobId = `job_${crypto.randomUUID()}`;

    // Create job tracking record
    await db.insert(dataLakehouseJobs).values({
      id: jobId,
      tenantId: targetTenantId,
      domain,
      status: 'IN_PROGRESS',
      createdAt: new Date().toISOString(),
    });

    const etlEngine = new EtlEngine();
    const { jobResult } = await etlEngine.executeIncrementalEtl({
      jobId,
      tenantId: targetTenantId,
      domain,
      lastWatermark,
      schema,
      fetchRecords: async (tId) => {
        // Return dummy / sample record array matching schema for extraction
        return [
          { id: 'rec-1', tenantId: tId, firstName: 'John', lastName: 'Doe', status: 'active', updatedAt: new Date().toISOString(), date: new Date().toISOString(), amount: 100, category: 'tuition' },
          { id: 'rec-2', tenantId: tId, firstName: 'Jane', lastName: 'Smith', status: 'active', updatedAt: new Date().toISOString(), date: new Date().toISOString(), amount: 150, category: 'exam' },
        ];
      },
    });

    return NextResponse.json({
      success: true,
      job: jobResult,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}, 'lakehouse:manage');
