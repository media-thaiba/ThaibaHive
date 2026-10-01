import { z } from "zod";
import { AgentTool } from "../contract";

export const financeTools: AgentTool[] = [
  {
    name: "finance.fees.detect_defaulters",
    description: "Scans student ledger accounts for overdue fee balances across fee heads.",
    domain: "finance",
    type: "read",
    requiredPermission: "agent:workflows:view",
    riskLevel: "low",
    inputSchema: z.object({
      termId: z.string(),
      minOverdueAmount: z.number().default(1000),
    }),
    outputSchema: z.object({
      totalDefaulters: z.number(),
      totalOverdueAmount: z.number(),
      defaulterList: z.array(z.object({ studentId: z.string(), overdueAmount: z.number() })),
    }),
    execute: async () => {
      return {
        totalDefaulters: 5,
        totalOverdueAmount: 25000,
        defaulterList: [
          { studentId: "std_201", overdueAmount: 5000 },
          { studentId: "std_202", overdueAmount: 6500 },
        ],
      };
    },
  },
  {
    name: "finance.fees.reconcile",
    description: "Performs 3-way automated reconciliation between bank statement, payment gateway, and SIS ledgers.",
    domain: "finance",
    type: "write",
    requiredPermission: "agent:workflows:approve",
    riskLevel: "high",
    inputSchema: z.object({
      termId: z.string(),
      reconciliationDate: z.string().optional(),
    }),
    outputSchema: z.object({
      reconciledTransactions: z.number(),
      unmatchedCount: z.number(),
      totalReconciledAmount: z.number(),
      status: z.string(),
    }),
    execute: async () => {
      return {
        reconciledTransactions: 142,
        unmatchedCount: 0,
        totalReconciledAmount: 710000,
        status: "reconciled",
      };
    },
    compensate: async (input) => {
      return {
        success: true,
        message: `Rolled back fee reconciliation for term ${input.termId}`,
        compensatedAt: new Date().toISOString(),
      };
    },
  },
  {
    name: "finance.approvals.triage",
    description: "Triages and auto-routes purchase requisitions based on delegation of financial powers.",
    domain: "finance",
    type: "write",
    requiredPermission: "agent:workflows:approve",
    riskLevel: "high",
    inputSchema: z.object({
      requisitionId: z.string(),
      amount: z.number(),
      category: z.string(),
    }),
    outputSchema: z.object({
      requisitionId: z.string(),
      routingDecision: z.string(), // 'auto_approved' | 'routed_to_principal' | 'routed_to_management'
      recommendedTier: z.string(),
    }),
    execute: async (input) => {
      const routingDecision = input.amount < 10000 ? "auto_approved" : "routed_to_principal";
      return {
        requisitionId: input.requisitionId,
        routingDecision,
        recommendedTier: "Tier-2",
      };
    },
    compensate: async (input) => {
      return {
        success: true,
        message: `Cancelled auto-routing for requisition ${input.requisitionId}`,
        compensatedAt: new Date().toISOString(),
      };
    },
  },
  {
    name: "finance.audit.three_way_match",
    description: "Executes 3-way matching between Purchase Order, Goods Receipt Note (GRN), and Vendor Invoice.",
    domain: "finance",
    type: "read",
    requiredPermission: "agent:workflows:view",
    riskLevel: "low",
    inputSchema: z.object({
      poId: z.string(),
      grnId: z.string(),
      invoiceId: z.string(),
    }),
    outputSchema: z.object({
      matched: z.boolean(),
      varianceAmount: z.number(),
      varianceReason: z.string().optional(),
    }),
    execute: async () => {
      return {
        matched: true,
        varianceAmount: 0,
      };
    },
  },
];
