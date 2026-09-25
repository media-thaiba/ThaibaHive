import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { mentorshipMatchingEngine } from '@/lib/operations/alumni/mentorship/mentorship-matching-engine';

export const POST = requireAuth(async (request) => {
  try {
    const body = await request.json();
    const { studentId, institutionId, department, degreeProgram, targetRole, targetIndustry, desiredSkills, limit } = body;

    if (!studentId || !institutionId || !department || !targetRole || !targetIndustry) {
      return NextResponse.json({ error: 'Missing required matching parameters' }, { status: 400 });
    }

    const matches = await mentorshipMatchingEngine.findTopMentorMatches(
      {
        studentId,
        institutionId,
        department,
        degreeProgram: degreeProgram || department,
        targetRole,
        targetIndustry,
        desiredSkills: desiredSkills || [],
      },
      limit || 5
    );

    return NextResponse.json({ success: true, matches });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Matching failed' }, { status: 500 });
  }
}, 'alumni:mentorship:view');
