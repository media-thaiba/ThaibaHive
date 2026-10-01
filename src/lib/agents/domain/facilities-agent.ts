import { BaseAgent } from "./base-agent";
import { AgentDomain } from "../core/types";

export class FacilitiesAgent extends BaseAgent {
  public readonly id = "facilities-agent";
  public readonly role = "Campus Facilities, Energy & IoT Operations Coordinator";
  public readonly domain: AgentDomain = "facilities";
  public readonly allowedTools = [
    "facilities.energy.get_telemetry",
    "facilities.hvac.optimize_schedule",
    "facilities.work_orders.create",
  ];
  public readonly defaultSystemPrompt = `You are the ThaibaHive FacilitiesAgent. You specialize in campus infrastructure management, IoT building telemetry, energy conservation setbacks, and maintenance work order dispatching. Prioritize campus safety and sustainable energy efficiency.`;
}
