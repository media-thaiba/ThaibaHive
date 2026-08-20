import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { CrossCampusBenchmarker } from '@/lib/operations/analytics/cross-campus-benchmarker';

// Standard mock campus data for confidential benchmarking
const defaultCampuses = [
  {
    campusId: 'campus_main',
    campusName: 'Main Campus',
    totalStudents: 1200,
    retainedStudents: 1100,
    graduatedStudents: 1020,
    facultyCount: 110,
    totalExpenditureDollars: 5200000,
    energyKwhPerSqMeter: 42,
    averageGpa: 3.5,
    timestamp: new Date().toISOString(),
  },
  {
    campusId: 'campus_north',
    campusName: 'North Campus',
    totalStudents: 750,
    retainedStudents: 680,
    graduatedStudents: 610,
    facultyCount: 70,
    totalExpenditureDollars: 3100000,
    energyKwhPerSqMeter: 55,
    averageGpa: 3.2,
    timestamp: new Date().toISOString(),
  },
  {
    campusId: 'campus_tech',
    campusName: 'Technology Campus',
    totalStudents: 900,
    retainedStudents: 850,
    graduatedStudents: 800,
    facultyCount: 95,
    totalExpenditureDollars: 4400000,
    energyKwhPerSqMeter: 36,
    averageGpa: 3.65,
    timestamp: new Date().toISOString(),
  },
];

export const GET = requireAuth(async (request: Request) => {
  try {
    const benchmarks = CrossCampusBenchmarker.computeConfidentialBenchmarking(defaultCampuses);
    return NextResponse.json({ success: true, benchmarks }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to compute benchmarks' },
      { status: 500 }
    );
  }
}, 'federated:read');
