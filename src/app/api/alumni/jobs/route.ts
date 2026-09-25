import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { jobBoardEngine } from '@/lib/operations/alumni/jobs/job-board-engine';
import { createJobPostingSchema } from '@/lib/validation/alumni-schemas';

export const GET = requireAuth(async (request) => {
  const url = new URL(request.url);
  const institutionId = url.searchParams.get('institutionId') || 'global';
  const department = url.searchParams.get('department') || undefined;
  const roleType = url.searchParams.get('roleType') || undefined;
  const workplaceType = url.searchParams.get('workplaceType') || undefined;
  const search = url.searchParams.get('search') || undefined;

  const jobs = await jobBoardEngine.listActiveJobsForStudents({
    institutionId,
    department,
    roleType,
    workplaceType,
    search,
  });

  return NextResponse.json({ success: true, jobs });
}, 'alumni:jobs:view');

export const POST = requireAuth(async (request, session) => {
  try {
    const body = await request.json();
    const parsed = createJobPostingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
    }

    const job = await jobBoardEngine.createJobPosting({
      ...parsed.data,
      postedByAlumniId: parsed.data.postedByAlumniId || session.staffId,
    });

    return NextResponse.json({ success: true, job }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create job posting' }, { status: 500 });
  }
}, 'alumni:jobs:post');

export const PATCH = requireAuth(async (request, session) => {
  try {
    const body = await request.json();
    const { jobId, institutionId, action, moderationNotes } = body;

    if (!jobId || !institutionId || !action) {
      return NextResponse.json({ error: 'jobId, institutionId and action required' }, { status: 400 });
    }

    const updated = await jobBoardEngine.moderateJobPosting(
      jobId,
      institutionId,
      action,
      session.staffId || 'admin',
      moderationNotes
    );

    return NextResponse.json({ success: true, job: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to moderate job posting' }, { status: 500 });
  }
}, 'alumni:jobs:manage');
