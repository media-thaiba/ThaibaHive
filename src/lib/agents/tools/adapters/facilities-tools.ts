import { z } from "zod";
import { AgentTool } from "../contract";

export const facilitiesTools: AgentTool[] = [
  {
    name: "facilities.energy.get_telemetry",
    description: "Fetches energy and IoT telemetry data to identify consumption spikes and idle zone power drains.",
    domain: "facilities",
    type: "read",
    requiredPermission: "agent:workflows:view",
    riskLevel: "low",
    inputSchema: z.object({
      buildingId: z.string().optional(),
      timeWindowMinutes: z.number().default(60),
    }),
    outputSchema: z.object({
      buildingId: z.string(),
      currentLoadKw: z.number(),
      baselineKw: z.number(),
      anomalyDetected: z.boolean(),
      idleZones: z.array(z.string()),
    }),
    execute: async (input) => {
      const bId = input.buildingId || "bld_main_campus";
      return {
        buildingId: bId,
        currentLoadKw: 148.5,
        baselineKw: 95.0,
        anomalyDetected: true,
        idleZones: ["Auditorium_B", "Science_Block_Wing_3"],
      };
    },
  },
  {
    name: "facilities.hvac.optimize_schedule",
    description: "Adjusts HVAC temperature setpoints and setbacks based on timetable occupancy.",
    domain: "facilities",
    type: "write",
    requiredPermission: "agent:workflows:execute",
    riskLevel: "medium",
    inputSchema: z.object({
      zoneId: z.string(),
      targetSetpointC: z.number(),
      setbackMode: z.boolean().default(true),
    }),
    outputSchema: z.object({
      zoneId: z.string(),
      appliedSetpointC: z.number(),
      estimatedSavingsKwh: z.number(),
      status: z.string(),
    }),
    execute: async (input) => {
      return {
        zoneId: input.zoneId,
        appliedSetpointC: input.targetSetpointC,
        estimatedSavingsKwh: 24.5,
        status: "optimized",
      };
    },
    compensate: async (input) => {
      return {
        success: true,
        message: `Restored default HVAC setpoints for zone ${input.zoneId}`,
        compensatedAt: new Date().toISOString(),
      };
    },
  },
  {
    name: "facilities.work_orders.create",
    description: "Dispatches preventive or reactive maintenance work orders to facility technicians.",
    domain: "facilities",
    type: "write",
    requiredPermission: "agent:workflows:execute",
    riskLevel: "medium",
    inputSchema: z.object({
      location: z.string(),
      issueCategory: z.enum(["electrical", "plumbing", "hvac", "structural", "security"]),
      priority: z.enum(["low", "medium", "high", "emergency"]).default("medium"),
      description: z.string(),
    }),
    outputSchema: z.object({
      workOrderId: z.string(),
      assignedTeam: z.string(),
      status: z.string(),
    }),
    execute: async (input) => {
      return {
        workOrderId: `wo_${Date.now()}`,
        assignedTeam: `facilities_${input.issueCategory}_team`,
        status: "dispatched",
      };
    },
    compensate: async (input, output) => {
      return {
        success: true,
        message: `Cancelled dispatched work order ${output?.workOrderId || "unknown"} at ${input.location}`,
        compensatedAt: new Date().toISOString(),
      };
    },
  },
];
