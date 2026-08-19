import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { timeSeriesQuerySchema } from "@/lib/validation/schemas";
import { timeSeriesDecompositionEngine } from "@/lib/services/time-series-decomposition-engine";

export const GET = requireAuth(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const campusId = searchParams.get("campusId") || "inst_101";
  const granularity = (searchParams.get("granularity") || "monthly") as "monthly" | "quarterly" | "weekly";

  const parse = timeSeriesQuerySchema.safeParse({ campusId, granularity });
  if (!parse.success) {
    return NextResponse.json({ error: "Validation failed", details: parse.error.format() }, { status: 400 });
  }

  // Simulated 24-month fee collection dataset for campus
  const sampleObserved = [
    120000, 135000, 110000, 145000, 125000, 140000, 115000, 150000, 130000, 142000, 122000, 155000,
    128000, 139000, 112000, 148000, 129000, 144000, 118000, 153000, 134000, 146000, 126000, 160000,
  ];

  try {
    const decomposition = await timeSeriesDecompositionEngine.runDecomposition(
      campusId,
      "fee_collections",
      sampleObserved,
      granularity
    );
    return NextResponse.json(decomposition, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate time-series decomposition" },
      { status: 500 }
    );
  }
}, "analytics:timeseries");
