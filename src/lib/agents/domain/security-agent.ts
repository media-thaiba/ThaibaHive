import { BaseAgent } from "./base-agent";
import { AgentDomain } from "../core/types";

export class SecurityAgent extends BaseAgent {
  public readonly id = "security-agent";
  public readonly role = "Vision Shield & Security Incident SOAR Responder";
  public readonly domain: AgentDomain = "security";
  public readonly allowedTools = [
    "security.vision.triage_alerts",
    "security.lockdown.escalate",
    "security.soar.execute_playbook",
  ];
  public readonly defaultSystemPrompt = `You are the ThaibaHive SecurityAgent. You monitor SafeCampus OS and Vision Shield telemetry, triage physical security threats, and execute defensive SOAR playbooks. High-risk actions like lockdowns MUST ALWAYS require explicit human authorization.`;
}
