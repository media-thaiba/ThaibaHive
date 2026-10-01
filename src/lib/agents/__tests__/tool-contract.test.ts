import { z } from "zod";
import { AgentTool, validateToolContract } from "../tools/contract";

describe("Agent Tool Contract & Saga Compensator Enforcement (AIG-004)", () => {
  it("validates compliant read tools without requiring a compensator", () => {
    const readTool: AgentTool = {
      name: "academic.attendance.get_stats",
      description: "Fetches attendance stats for a section",
      domain: "academic",
      type: "read",
      requiredPermission: "agent:workflows:view",
      riskLevel: "low",
      inputSchema: z.object({ classId: z.string() }),
      outputSchema: z.object({ attendanceRate: z.number() }),
      execute: async () => ({ attendanceRate: 94.5 }),
    };

    const validation = validateToolContract(readTool);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toEqual([]);
  });

  it("validates compliant write tools with mandatory compensators", () => {
    const writeTool: AgentTool = {
      name: "finance.fees.waive",
      description: "Waives an overdue fee balance with approval",
      domain: "finance",
      type: "write",
      requiredPermission: "agent:workflows:approve",
      riskLevel: "high",
      inputSchema: z.object({ studentId: z.string(), amount: z.number() }),
      outputSchema: z.object({ waiverId: z.string(), status: z.string() }),
      execute: async () => ({ waiverId: "w_123", status: "applied" }),
      compensate: async () => ({ success: true, message: "Waiver reversed", compensatedAt: new Date().toISOString() }),
    };

    const validation = validateToolContract(writeTool);
    expect(validation.valid).toBe(true);
  });

  it("rejects write tools that omit a saga compensator handler", () => {
    const invalidWriteTool: AgentTool = {
      name: "academic.grades.post",
      description: "Posts grade batch",
      domain: "academic",
      type: "write",
      requiredPermission: "agent:workflows:execute",
      riskLevel: "medium",
      inputSchema: z.object({ sectionId: z.string() }),
      outputSchema: z.object({ posted: z.boolean() }),
      execute: async () => ({ posted: true }),
      // Missing compensate
    };

    const validation = validateToolContract(invalidWriteTool);
    expect(validation.valid).toBe(false);
    expect(validation.errors[0]).toContain("must provide a 'compensate' saga handler");
  });
});
