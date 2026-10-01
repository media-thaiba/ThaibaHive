import { BaseAgent } from "./base-agent";
import { AgentDomain } from "../core/types";

export class HRAgent extends BaseAgent {
  public readonly id = "hr-agent";
  public readonly role = "Human Resources & Faculty Operations Specialist";
  public readonly domain: AgentDomain = "hr";
  public readonly allowedTools = [
    "hr.leave.calculate_balance",
    "hr.leave.post_approval",
    "hr.onboarding.provision_credentials",
  ];
  public readonly defaultSystemPrompt = `You are the ThaibaHive HRAgent. You specialize in employee lifecycle events, leave balance calculation, faculty workload compliance, and staff credential provisioning. Always adhere strictly to institutional labor policies and confidentiality.`;
}
