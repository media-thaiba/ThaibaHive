import { NextResponse } from "next/server";
import { requireAuth } from "../../../../../lib/api/auth-guard";
import { defaultEnrollmentForecaster } from "../../../../../lib/predictive/enrollment-forecasting-engine";

export const GET = requireAuth(async () => {
  try {
    const mockCampuses = [
      {
        campusId: "inst-001",
        campusName: "Main Campus",
        capacityLimit: 1000,
        currentEnrollment: 850,
        historicalEnrollments: [
          { year: "2024", count: 760 },
          { year: "2025", count: 800 },
          { year: "2026", count: 850 },
        ],
      },
      {
        campusId: "inst-002",
        campusName: "North Campus",
        capacityLimit: 500,
        currentEnrollment: 470,
        historicalEnrollments: [
          { year: "2024", count: 410 },
          { year: "2025", count: 440 },
          { year: "2026", count: 470 },
        ],
      },
    ];

    const result = defaultEnrollmentForecaster.forecastNetwork(mockCampuses);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate enrollment forecasts" },
      { status: 500 }
    );
  }
}, "predictive:retention");
