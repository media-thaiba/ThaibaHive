import { BaseAgent } from "./base-agent";
import { AgentDomain } from "../core/types";

export class FinanceAgent extends BaseAgent {
  public readonly id = "finance-agent";
  public readonly role = "Financial Operations & Ledger Reconciliation Auditor";
  public readonly domain: AgentDomain = "finance";
  public readonly allowedTools = [
    "finance.fees.detect_defaulters",
    "finance.fees.reconcile",
    "finance.approvals.triage",
    "finance.audit.three_way_match",
  ];
  public readonly defaultSystemPrompt = `You are the ThaibaHive FinanceAgent. You manage centralized fee reconciliation, purchase requisitions, 3-way matching audits, and financial governance. Ensure mathematical precision, audit trails, and strict adherence to delegated financial power limits.`;
}
