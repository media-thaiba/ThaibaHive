import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { kmRecommendationsSchema } from '@/lib/validation/km-schemas';
import { careerMatcher } from '@/lib/operations/km/advising/career-matcher';
import { scheduleOptimizer } from '@/lib/operations/km/advising/schedule-optimizer';

export const POST = requireAuth(async (request: Request) => {
  try {
    const body = await request.json();
    const parse = kmRecommendationsSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: 'Validation failed', details: parse.error.format() }, { status: 400 });
    }

    const { studentId, type, targetTermsCount } = parse.data;

    if (type === 'careers') {
      const sampleTranscript = [
        { courseCode: 'CS-101', courseTitle: 'Intro to CS', credits: 4, grade: 'A' as const, term: 'Fall 2024' },
        { courseCode: 'CS-401', courseTitle: 'AI', credits: 4, grade: 'A' as const, term: 'Spring 2025' },
      ];
      const careers = careerMatcher.matchStudentToCareers(sampleTranscript);
      return NextResponse.json({ success: true, studentId, type, recommendations: careers }, { status: 200 });
    }

    if (type === 'schedule') {
      const schedule = scheduleOptimizer.generateOptimalSchedule(['CS-102', 'CS-201', 'CS-301', 'CS-401'], ['CS-101'], {
        targetTermsCount,
      });
      return NextResponse.json({ success: true, studentId, type, schedule }, { status: 200 });
    }

    return NextResponse.json({
      success: true,
      studentId,
      type: 'electives',
      recommendedElectives: [
        { code: 'CS-401', title: 'Artificial Intelligence', relevance: 'High (Track Match)' },
        { code: 'CS-350', title: 'Software Engineering', relevance: 'Core Requirement' },
        { code: 'CS-402', title: 'Deep Learning', relevance: 'Career Specialization' },
      ],
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to generate recommendations' }, { status: 500 });
  }
}, 'km:knowledge:search');
