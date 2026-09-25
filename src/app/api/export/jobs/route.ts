import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { exportStreamSchema } from '@/lib/validation/docgen-schemas';
import { ExportJobManager } from '@/lib/operations/docgen/export/export-job-manager';
import { DocDbStore } from '@/lib/db/docgen-store';

export const GET = requireAuth(async (request, session) => {
  const url = new URL(request.url);
  const institutionId = url.searchParams.get('institutionId') || 'global';
  const jobId = url.searchParams.get('jobId');

  const store = DocDbStore.getInstance();

  if (jobId) {
    const job = await store.getExportJobById(jobId, institutionId);
    if (!job) {
      return NextResponse.json({ error: 'Export job not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, job });
  }

  const jobs = await store.listExportJobs(institutionId, session.staffId);
  return NextResponse.json({ success: true, jobs });
}, 'exports:read');

export const POST = requireAuth(async (request, session) => {
  try {
    const body = await request.json();
    const parsed = exportStreamSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
    }

    const manager = ExportJobManager.getInstance();
    const job = await manager.submitExportJob(session.staffId, {
      institutionId: parsed.data.institutionId,
      jobType: parsed.data.jobType,
      format: parsed.data.format,
      columns: parsed.data.columns,
      filterParams: parsed.data.filterParams,
      data: parsed.data.data,
    });

    return NextResponse.json({ success: true, job }, { status: 202 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to submit export job' }, { status: 500 });
  }
}, 'exports:create');
