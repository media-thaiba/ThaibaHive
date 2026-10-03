import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { copilotQuerySchema } from "@/lib/validation/schemas";
import { academicAdvisorAgent } from "@/lib/services/academic-advisor-agent";
import { financialControllerAgent } from "@/lib/services/financial-controller-agent";
import { complianceAuditorAgent } from "@/lib/services/compliance-auditor-agent";
import { resolveRequestInstitution } from "@thaiba/auth/institution-scope";

export const POST = requireAuth(async (request: Request, session) => {
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

  const { agentType, campusId, query } = parse.data;
  const resolvedCampusId = resolveRequestInstitution(session, campusId);

  try {
    if (agentType === "academic_advisor") {
      const rec = await academicAdvisorAgent.analyzeAndRecommend(resolvedCampusId, [], query);
      return NextResponse.json(rec, { status: 200 });
    } else if (agentType === "financial_controller") {
      const rec = await financialControllerAgent.analyzeAndRecommend(
        resolvedCampusId,
        {
          campusId: resolvedCampusId,
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
        resolvedCampusId,
        {
          campusId: resolvedCampusId,
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
  } catch (error: any) {
    if (error?.name === "TenantMismatchError") {
      throw error;
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to execute copilot query" },
      { status: 500 }
    );
  }
}, "copilot:interact");
