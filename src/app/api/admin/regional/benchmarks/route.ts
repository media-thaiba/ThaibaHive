import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { RegionalBenchmarkingService } from "@/lib/regional/regional-benchmarking-service";
import { regionalBenchmarkQuerySchema } from "@/lib/validation/schemas";

export const GET = requireAuth(async (request: Request) => {
  const url = new URL(request.url);
  const regionalGroupId = url.searchParams.get("regionalGroupId");
  const period = url.searchParams.get("period") || "30d";
  const metricDomain = url.searchParams.get("metricDomain") || "all";

  const parse = regionalBenchmarkQuerySchema.safeParse({ regionalGroupId, period, metricDomain });
  if (!parse.success) {
    return NextResponse.json({ error: "Validation failed", details: parse.error.format() }, { status: 400 });
  }

  try {
    const benchmarks = await RegionalBenchmarkingService.calculateBenchmarks(parse.data);
    return NextResponse.json({ benchmarks }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to calculate benchmarks" },
      { status: 500 }
    );
  }
}, "regional:view");
