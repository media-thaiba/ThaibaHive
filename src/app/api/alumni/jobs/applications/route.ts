import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { jobApplicationEngine } from '@/lib/operations/alumni/jobs/job-application-engine';
import { submitJobApplicationSchema } from '@/lib/validation/alumni-schemas';

export const GET = requireAuth(async (request) => {
  const url = new URL(request.url);
  const institutionId = url.searchParams.get('institutionId') || 'global';
  const metricsOnly = url.searchParams.get('metrics') === 'true';

  if (metricsOnly) {
    const metrics = await jobApplicationEngine.getPlacementMetrics(institutionId);
    return NextResponse.json({ success: true, metrics });
  }

  const jobPostingId = url.searchParams.get('jobPostingId');
  if (!jobPostingId) {
    return NextResponse.json({ error: 'jobPostingId parameter required' }, { status: 400 });
  }

  const apps = await jobApplicationEngine.getPlacementMetrics(institutionId);
  return NextResponse.json({ success: true, metrics: apps });
}, 'alumni:jobs:view');

export const POST = requireAuth(async (request) => {
  try {
    const body = await request.json();
    const parsed = submitJobApplicationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
    }

    const app = await jobApplicationEngine.submitApplication(parsed.data);
    return NextResponse.json({ success: true, application: app }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Application submission failed' }, { status: 500 });
  }
}, 'alumni:jobs:apply');

export const PATCH = requireAuth(async (request) => {
  try {
    const body = await request.json();
    const { applicationId, status, recruiterFeedback } = body;

    if (!applicationId || !status) {
      return NextResponse.json({ error: 'applicationId and status required' }, { status: 400 });
    }

    const updated = await jobApplicationEngine.updateApplicationStatus(applicationId, status, recruiterFeedback);
    return NextResponse.json({ success: true, application: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Application update failed' }, { status: 500 });
  }
}, 'alumni:jobs:manage');
