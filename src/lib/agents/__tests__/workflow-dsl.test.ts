import { parseWorkflowDsl, interpolateStepInput } from "../workflow/dsl/parser";
import { workflowAstValidator } from "../workflow/dsl/validator";

describe("Workflow DSL Parsing, Interpolation & AST Validation Suite (AIG-012)", () => {
  const sampleValidDsl = {
    key: "semester-closing",
    name: "Semester Closing Orchestration",
    dslVersion: 1,
    version: 1,
    triggers: [{ type: "schedule", cron: "0 0 1 1,7 *" }],
    defaults: { maxRetries: 2, timeoutMs: 300000, onFailure: "compensate" as const },
    steps: [
      {
        key: "reconcile-fees",
        type: "action",
        agent: "finance-agent",
        tool: "finance.fees.reconcile",
        input: { termId: "{{trigger.termId}}" },
        approval: { required: true, permission: "agent:workflows:approve", severity: "high" },
      },
      {
        key: "branch-check",
        type: "branch",
        condition: "{{steps.reconcile-fees.output.unmatchedCount}} == 0",
        then: "notify-success",
        else: "notify-review",
      },
      {
        key: "notify-success",
        type: "action",
        agent: "academic-agent",
        tool: "academic.grades.post_batch",
        input: { termId: "fall_2026", courseId: "CS101", grades: [] },
      },
      {
        key: "notify-review",
        type: "action",
        agent: "finance-agent",
        tool: "finance.approvals.triage",
        input: { requisitionId: "req-1", amount: 500, category: "review" },
      },
    ],
  };

  it("parses and validates a compliant workflow definition JSON", () => {
    const parseRes = parseWorkflowDsl(sampleValidDsl);
    expect(parseRes.success).toBe(true);
    expect(parseRes.data?.key).toBe("semester-closing");

    const astRes = workflowAstValidator.validate(parseRes.data!);
    expect(astRes.valid).toBe(true);
    expect(astRes.errors).toEqual([]);
  });

  it("interpolates template variables across triggers and step outputs", () => {
    const inputTemplate = {
      term: "{{trigger.termId}}",
      details: {
        score: "{{steps.exam.output.average}}",
        fixed: 100,
      },
    };

    const scope = {
      trigger: { termId: "term_spring_2026" },
      steps: { exam: { output: { average: 88.5 } } },
    };

    const interpolated = interpolateStepInput(inputTemplate, scope);
    expect(interpolated.term).toBe("term_spring_2026");
    expect(interpolated.details.score).toBe("88.5");
    expect(interpolated.details.fixed).toBe(100);
  });

  it("detects and rejects cycles in the workflow execution graph", () => {
    const cyclicDsl = {
      ...sampleValidDsl,
      steps: [
        {
          key: "node-a",
          type: "branch",
          then: "node-b",
        },
        {
          key: "node-b",
          type: "branch",
          then: "node-a", // Cycle back to A
        },
      ],
    };

    const parseRes = parseWorkflowDsl(cyclicDsl);
    expect(parseRes.success).toBe(true);

    const astRes = workflowAstValidator.validate(parseRes.data!);
    expect(astRes.valid).toBe(false);
    expect(astRes.errors.some((e) => e.includes("Cycle detected"))).toBe(true);
  });

  it("detects dangling targets referencing non-existent steps", () => {
    const brokenDsl = {
      ...sampleValidDsl,
      steps: [
        {
          key: "step-1",
          type: "branch",
          then: "non-existent-step",
        },
      ],
    };

    const parseRes = parseWorkflowDsl(brokenDsl);
    expect(parseRes.success).toBe(true);

    const astRes = workflowAstValidator.validate(parseRes.data!);
    expect(astRes.valid).toBe(false);
    expect(astRes.errors.some((e) => e.includes("non-existent target step"))).toBe(true);
  });
});
