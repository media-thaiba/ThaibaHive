import { copilotQuerySchema, copilotFeedbackSchema } from "@/lib/validation/schemas";

jest.mock("@/lib/api/auth-guard", () => ({
  requireAuth: (fn: (...args: any[]) => any) => fn,
}));

describe("Sprint-011 AI Copilot API Route Validation & Handlers", () => {
  it("validates copilot query POST payload via copilotQuerySchema", () => {
    const valid = copilotQuerySchema.safeParse({
      agentType: "academic_advisor",
      campusId: "inst_101",
      query: "Suggest math remediation for Grade 10",
    });
    expect(valid.success).toBe(true);

    const invalid = copilotQuerySchema.safeParse({
      agentType: "invalid_agent",
      query: "",
    });
    expect(invalid.success).toBe(false);
  });

  it("validates copilot feedback POST payload via copilotFeedbackSchema", () => {
    const valid = copilotFeedbackSchema.safeParse({
      recommendationId: "rec_1001",
      approvalStatus: "APPROVED",
      feedbackNotes: "Proceed with intervention",
    });
    expect(valid.success).toBe(true);

    const invalid = copilotFeedbackSchema.safeParse({
      recommendationId: "",
      approvalStatus: "INVALID_STATUS",
    });
    expect(invalid.success).toBe(false);
  });
});
