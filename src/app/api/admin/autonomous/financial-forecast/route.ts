import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { FinancialRealizationService } from "@/lib/services/financial-realization-service";
import { financialForecastQuerySchema } from "@/lib/validation/schemas";

export const GET = requireAuth(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const campusId = searchParams.get("campusId") ?? undefined;
  const horizonDaysStr = searchParams.get("horizonDays");
  const confidenceLevelStr = searchParams.get("confidenceLevel");

  const queryParams = {
    campusId,
    horizonDays: horizonDaysStr ? parseInt(horizonDaysStr, 10) : undefined,
    confidenceLevel: confidenceLevelStr ? parseFloat(confidenceLevelStr) : undefined,
  };

  const parse = financialForecastQuerySchema.safeParse(queryParams);
  if (!parse.success) {
    return NextResponse.json({ error: "Validation failed", details: parse.error.format() }, { status: 400 });
  }

  try {
    const data = await FinancialRealizationService.getRealizationForecast({
      campusId: parse.data.campusId,
      horizonDays: parse.data.horizonDays,
      confidenceLevel: parse.data.confidenceLevel,
    });

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Financial realization forecast failed" },
      { status: 500 }
    );
  }
}, "financial:forecast");
