import { z } from "zod";
import { AgentTool } from "../contract";

export const securityTools: AgentTool[] = [
  {
    name: "security.vision.triage_alerts",
    description: "Evaluates unacknowledged threat alerts and ALPR telemetry from Vision Shield edge nodes.",
    domain: "security",
    type: "read",
    requiredPermission: "agent:workflows:view",
    riskLevel: "low",
    inputSchema: z.object({
      facilityId: z.string().optional(),
      minSeverity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
    }),
    outputSchema: z.object({
      unacknowledgedCount: z.number(),
      highestSeverity: z.string(),
      alerts: z.array(z.object({ alertId: z.string(), severity: z.string(), description: z.string() })),
    }),
    execute: async () => {
      return {
        unacknowledgedCount: 1,
        highestSeverity: "high",
        alerts: [
          { alertId: "alt_091", severity: "high", description: "Perimeter fence intrusion detected in Zone 3" },
        ],
      };
    },
  },
  {
    name: "security.lockdown.escalate",
    description: "Escalates physical security lockdown request to institutional command staff (Always HITL gated).",
    domain: "security",
    type: "write",
    requiredPermission: "agent:workflows:approve",
    riskLevel: "critical",
    inputSchema: z.object({
      zoneId: z.string(),
      reason: z.string(),
      lockdownType: z.enum(["perimeter", "full_campus", "building_specific"]),
    }),
    outputSchema: z.object({
      lockdownEventId: z.string(),
      status: z.string(),
      requiresPhysicalConfirmation: z.boolean(),
    }),
    execute: async (_input) => {
      return {
        lockdownEventId: `lock_${Date.now()}`,
        status: "pending_physical_confirmation",
        requiresPhysicalConfirmation: true,
      };
    },
    compensate: async (input, output) => {
      return {
        success: true,
        message: `Cancelled lockdown escalation event ${output?.lockdownEventId}`,
        compensatedAt: new Date().toISOString(),
      };
    },
  },
  {
    name: "security.soar.execute_playbook",
    description: "Executes automated SOAR incident response playbook (credential rotation, camera zoom, guard dispatch).",
    domain: "security",
    type: "write",
    requiredPermission: "agent:workflows:execute",
    riskLevel: "high",
    inputSchema: z.object({
      playbookId: z.string(),
      incidentId: z.string(),
    }),
    outputSchema: z.object({
      executionId: z.string(),
      actionsCompleted: z.array(z.string()),
      status: z.string(),
    }),
    execute: async (_input) => {
      return {
        executionId: `soar_${Date.now()}`,
        actionsCompleted: ["guard_dispatched", "ptz_locked_on_target", "log_anchored"],
        status: "completed",
      };
    },
    compensate: async (input, output) => {
      return {
        success: true,
        message: `Recalled SOAR playbook actions for execution ${output?.executionId}`,
        compensatedAt: new Date().toISOString(),
      };
    },
  },
];
