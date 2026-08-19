import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { ComplianceReportingService } from "@/lib/services/compliance-reporting-service";
import { complianceReportSchema } from "@/lib/validation/schemas";

export const GET = requireAuth(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const frameworkCode = searchParams.get("framework") || searchParams.get("frameworkCode") || "regional_privacy_v1";
  const institutionId = searchParams.get("institutionId") ?? undefined;
  const format = searchParams.get("format") ?? "pdf";

  const parse = complianceReportSchema.safeParse({ frameworkCode, institutionId, format });
  if (!parse.success) {
    return NextResponse.json({ error: "Validation failed", details: parse.error.format() }, { status: 400 });
  }

  try {
    const report = await ComplianceReportingService.evaluateCompliance(
      parse.data.frameworkCode,
      parse.data.institutionId
    );

    return NextResponse.json(report, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Compliance report evaluation failed" },
      { status: 500 }
    );
  }
}, "compliance:audit");
