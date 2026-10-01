import { AcademicAgent } from "../domain/academic-agent";
import { StubReasoningPort } from "../orchestrator/reasoning-port";
import { ToolRegistry } from "../tools/tool-registry";
import { ToolExecutor } from "../tools/executor";
import { AgentDbStore } from "../../db/agent-store";
import { academicTools } from "../tools/adapters/academic-tools";

describe("AcademicAgent Domain Implementation Suite (AIG-007)", () => {
  let agent: AcademicAgent;
  let registry: ToolRegistry;
  let executor: ToolExecutor;
  let store: AgentDbStore;
  let stubPort: StubReasoningPort;

  beforeEach(() => {
    registry = ToolRegistry.getInstance();
    registry.clear();

    store = AgentDbStore.getInstance();
    store.clearMemoryStore();

    executor = new ToolExecutor({ registry, store });
    academicTools.forEach((t) => registry.registerTool(t));

    stubPort = new StubReasoningPort();
    agent = new AcademicAgent({
      reasoningPort: stubPort,
      executor,
      registry,
    });
  });

  it("plans and executes attendance anomaly remediation", async () => {
    stubPort.setMockHandler(async (req) => {
      if (req.prompt.includes("Prior steps: []")) {
        return {
          content: "Detected anomaly in grade 10, executing reconciliation.",
          toolCalls: [
            {
              id: "call_1",
              name: "academic.attendance.reconcile",
              arguments: { sectionId: "sec-10A", date: "2026-10-01" },
            },
          ],
          provider: "stub",
          model: "stub-model",
        };
      }
      return {
        content: "Attendance reconciliation completed successfully for section 10A.",
        toolCalls: [],
        provider: "stub",
        model: "stub-model",
      };
    });

    const result = await agent.run({
      tenant: {
        institutionId: "inst_alpha",
        userId: "user_hod",
        userRole: "hod",
        permissions: ["*"],
      },
      goal: "Reconcile daily biometric attendance logs for section 10A",
    });

    expect(result.status).toBe("success");
    expect(result.domain).toBe("academic");
    expect(result.steps.length).toBe(2);
    expect(result.steps[0].toolCall?.name).toBe("academic.attendance.reconcile");
  });

  it("plans batch grade posting and pauses for approval on high-risk action (Scenario 2)", async () => {
    stubPort.setMockHandler(async () => {
      return {
        content: "Posting final exam grade batch for course CS101",
        toolCalls: [
          {
            id: "call_grade_1",
            name: "academic.grades.post_batch",
            arguments: {
              termId: "fall_2026",
              courseId: "CS101",
              grades: [{ studentId: "std_101", score: 92 }],
            },
          },
        ],
        provider: "stub",
        model: "stub-model",
      };
    });

    const result = await agent.run({
      tenant: {
        institutionId: "inst_alpha",
        userId: "user_faculty",
        userRole: "staff",
        permissions: ["agent:workflows:execute"],
      },
      goal: "Post Fall 2026 CS101 final assessment grades",
    });

    expect(result.status).toBe("requires_approval");
    expect(result.requiresApproval?.toolName).toBe("academic.grades.post_batch");
    expect(result.requiresApproval?.severity).toBe("high");
  });

  it("plans and executes timetable conflict resolution across department schedules (Scenario 3)", async () => {
    stubPort.setMockHandler(async (req) => {
      if (req.prompt.includes("Prior steps: []")) {
        return {
          content: "Room collision detected between CS201 and EE201. Resolving.",
          toolCalls: [
            {
              id: "call_tt_1",
              name: "academic.timetables.resolve_conflicts",
              arguments: { departmentId: "dept_cs", academicYear: "2026-2027" },
            },
          ],
          provider: "stub",
          model: "stub-model",
        };
      }
      return {
        content: "Timetable collision resolved and published as v2.1.",
        toolCalls: [],
        provider: "stub",
        model: "stub-model",
      };
    });

    const result = await agent.run({
      tenant: {
        institutionId: "inst_alpha",
        userId: "user_hod",
        userRole: "hod",
        permissions: ["*"],
      },
      goal: "Resolve timetable collisions for CS department",
    });

    expect(result.status).toBe("success");
    expect(result.steps[0].toolCall?.name).toBe("academic.timetables.resolve_conflicts");
    expect(result.steps[0].toolResult.conflictsResolved).toBe(3);
  });
});

