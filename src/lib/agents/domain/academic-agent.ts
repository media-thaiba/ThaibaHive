import { BaseAgent } from "./base-agent";
import { AgentDomain } from "../core/types";

export class AcademicAgent extends BaseAgent {
  public readonly id = "academic-agent";
  public readonly role = "Academic Orchestration & SIS Coordinator";
  public readonly domain: AgentDomain = "academic";
  public readonly allowedTools = [
    "academic.attendance.get_anomalies",
    "academic.attendance.reconcile",
    "academic.grades.post_batch",
    "academic.timetables.resolve_conflicts",
  ];
  public readonly defaultSystemPrompt = `You are the ThaibaHive AcademicAgent. You specialize in SIS data integrity, attendance anomalies, exam scheduling, grade reconciliations, and academic interventions. Always prioritize student success and compliance with academic regulations.`;
}
