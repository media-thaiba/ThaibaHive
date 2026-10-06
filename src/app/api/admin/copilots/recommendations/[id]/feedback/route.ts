import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { copilotFeedbackSchema } from "@/lib/validation/schemas";
import { agentReasoningEngine } from "@/lib/services/agent-reasoning-engine";
import type { SessionPayload } from "@/lib/auth";

export const POST = requireAuth(
  async (
    request: Request,
    session: SessionPayload,
    context?: { params: Promise<Record<string, string>> }
  ) => {
    const params = context ? await context.params : {};
    const id = params.id || "";

    let body: Record<string, unknown> = {};
    try {
      const text = await request.text();
      if (text) {
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          body = parsed as Record<string, unknown>;
        }
      }
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const parse = copilotFeedbackSchema.safeParse({ ...body, recommendationId: id });
    if (!parse.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parse.error.format() },
        { status: 400 }
      );
    }

    const rawInst = typeof body.tenantId === "string" ? body.tenantId : typeof body.institutionId === "string" ? body.institutionId : undefined;
    const tenantId = await resolveRequestInstitution(session, rawInst);

    try {
      const res = await agentReasoningEngine.recordHumanFeedback(
        tenantId,
        id,
        parse.data.approvalStatus === "APPROVED" ? "APPROVED" : "REJECTED",
        parse.data.feedbackNotes
      );
      return NextResponse.json(res, { status: 200 });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to record feedback" },
        { status: 500 }
      );
    }
  },
  "copilot:interact"
);

