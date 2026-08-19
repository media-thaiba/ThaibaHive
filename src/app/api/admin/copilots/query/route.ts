import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { copilotQuerySchema } from "@/lib/validation/schemas";
import { academicAdvisorAgent } from "@/lib/services/academic-advisor-agent";
import { financialControllerAgent } from "@/lib/services/financial-controller-agent";
import { complianceAuditorAgent } from "@/lib/services/compliance-auditor-agent";

export const POST = requireAuth(async (request: Request) => {
  let body: unknown = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parse = copilotQuerySchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: "Validation failed", details: parse.error.format() }, { status: 400 });
  }

  const { agentType, campusId = "inst_101", query } = parse.data;

  try {
    if (agentType === "academic_advisor") {
      const rec = await academicAdvisorAgent.analyzeAndRecommend(campusId, [], query);
      return NextResponse.json(rec, { status: 200 });
    } else if (agentType === "financial_controller") {
      const rec = await financialControllerAgent.analyzeAndRecommend(
        campusId,
        {
          campusId,
          campusName: "Main Campus",
          targetBudget: 1000000,
          currentRealization: 920000,
          unspentDepartmentalFunds: [{ departmentName: "Library", amount: 45000 }],
          projectedDeficitPercent: 8.0,
        },
        query
      );
      return NextResponse.json(rec, { status: 200 });
    } else {
      const rec = await complianceAuditorAgent.analyzeAndRecommend(
        campusId,
        {
          campusId,
          frameworkCode: "regional_privacy_v1",
          overallComplianceScore: 94.5,
          vaultIntegrityStatus: "VALIDATED",
          pendingCertificationsCount: 2,
          missingSafetyLogsCount: 0,
        },
        query
      );
      return NextResponse.json(rec, { status: 200 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to execute copilot query" },
      { status: 500 }
    );
  }
}, "copilot:interact");
