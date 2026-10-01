import { z } from "zod";
import { AgentTool } from "../contract";

export const hrTools: AgentTool[] = [
  {
    name: "hr.leave.calculate_balance",
    description: "Queries employee leave ledger and computes remaining paid, sick, and sabbatical days.",
    domain: "hr",
    type: "read",
    requiredPermission: "agent:workflows:view",
    riskLevel: "low",
    inputSchema: z.object({
      staffId: z.string(),
      leaveType: z.enum(["casual", "sick", "earned", "sabbatical"]).default("casual"),
    }),
    outputSchema: z.object({
      staffId: z.string(),
      leaveType: z.string(),
      remainingDays: z.number(),
      pendingApprovals: z.number(),
    }),
    execute: async (input) => {
      return {
        staffId: input.staffId,
        leaveType: input.leaveType,
        remainingDays: 14.5,
        pendingApprovals: 1,
      };
    },
  },
  {
    name: "hr.leave.post_approval",
    description: "Finalizes staff leave approval and deducts approved days from the institutional ledger.",
    domain: "hr",
    type: "write",
    requiredPermission: "agent:workflows:execute",
    riskLevel: "high",
    inputSchema: z.object({
      requestId: z.string(),
      staffId: z.string(),
      days: z.number(),
      approved: z.boolean(),
    }),
    outputSchema: z.object({
      requestId: z.string(),
      staffId: z.string(),
      status: z.string(),
      deductedDays: z.number(),
    }),
    execute: async (input) => {
      return {
        requestId: input.requestId,
        staffId: input.staffId,
        status: input.approved ? "approved" : "rejected",
        deductedDays: input.approved ? input.days : 0,
      };
    },
    compensate: async (input) => {
      return {
        success: true,
        message: `Restored ${input.days} leave days to staff ${input.staffId} for request ${input.requestId}`,
        compensatedAt: new Date().toISOString(),
      };
    },
  },
  {
    name: "hr.onboarding.provision_credentials",
    description: "Provisions digital identity, access badges, and institutional email for newly hired staff.",
    domain: "hr",
    type: "write",
    requiredPermission: "agent:workflows:execute",
    riskLevel: "medium",
    inputSchema: z.object({
      staffId: z.string(),
      officialEmail: z.string().email(),
      assignedDepartment: z.string(),
      badgeNumber: z.string(),
    }),
    outputSchema: z.object({
      staffId: z.string(),
      provisionedEmail: z.string(),
      badgeActive: z.boolean(),
      status: z.string(),
    }),
    execute: async (input) => {
      return {
        staffId: input.staffId,
        provisionedEmail: input.officialEmail,
        badgeActive: true,
        status: "provisioned",
      };
    },
    compensate: async (input) => {
      return {
        success: true,
        message: `Revoked credentials and deactivated badge ${input.badgeNumber} for staff ${input.staffId}`,
        compensatedAt: new Date().toISOString(),
      };
    },
  },
];
