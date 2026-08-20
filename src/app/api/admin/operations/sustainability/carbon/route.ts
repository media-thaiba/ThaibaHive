import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { withDPoP } from '@/lib/identity/dpop-middleware';
import { CarbonCalculator } from '@/lib/operations/sustainability/carbon-calculator';
import { EsgReportGenerator } from '@/lib/operations/sustainability/esg-report-generator';
import { CarbonReductionPlanner } from '@/lib/operations/sustainability/carbon-reduction-planner';

export const GET = withDPoP(
  requireAuth(async (req: Request) => {
    const { searchParams } = new URL(req.url);
    const campusId = searchParams.get('campusId') || 'campus_main';

    const calculator = new CarbonCalculator();
    const generator = new EsgReportGenerator();
    const planner = new CarbonReductionPlanner();

    const emissions = calculator.calculateEmissions({
      fuelLitersConsumed: 1200,
      gridElectricityKwh: 45000,
      cloudComputeCoreHours: 25000,
    });

    const esgReport = generator.generateReport(
      campusId,
      '2026-Q3',
      emissions,
      2500,
      42.0,
      'inst_default'
    );

    const initiatives = planner.generateAbatementPlan(45000, 1200);

    return NextResponse.json({
      esgReport,
      emissions,
      initiatives,
    });
  }, 'system:sustainability:view'),
  { required: false }
);
