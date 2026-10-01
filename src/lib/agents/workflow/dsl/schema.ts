import { z } from "zod";

export const dslNodeTypeSchema = z.enum([
  "action",
  "parallel",
  "branch",
  "approval",
  "wait",
  "subworkflow",
  "compensate",
]);

export const dslTriggerSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("manual"),
  }),
  z.object({
    type: z.literal("schedule"),
    cron: z.string(),
  }),
  z.object({
    type: z.literal("event"),
    topic: z.string(),
    filter: z.record(z.string(), z.any()).optional(),
  }),
  z.object({
    type: z.literal("anomaly"),
    subsystem: z.string(),
    severityThreshold: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  }),
]);

export const dslApprovalConfigSchema = z.object({
  required: z.boolean(),
  permission: z.string().default("agent:workflows:approve"),
  severity: z.enum(["critical", "high", "medium", "low"]).default("medium"),
  autoExpireHours: z.number().optional(),
  onExpiry: z.enum(["escalate", "hold", "reject"]).default("escalate"),
});

export const dslFailureActionSchema = z.object({
  action: z.enum(["compensate", "retry", "ignore", "goto"]),
  goto: z.string().optional(),
  maxRetries: z.number().optional(),
});

export const dslStepSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    key: z.string(),
    type: dslNodeTypeSchema.default("action"),
    agent: z.string().optional(),
    tool: z.string().optional(),
    input: z.record(z.string(), z.any()).optional(),
    approval: dslApprovalConfigSchema.optional(),
    onFailure: dslFailureActionSchema.optional(),
    
    // Branch specific
    condition: z.string().optional(),
    then: z.string().optional(),
    else: z.string().optional(),
    next: z.string().optional(),

    // Parallel specific
    steps: z.array(dslStepSchema).optional(),

    // Wait specific
    waitMs: z.number().optional(),
  })
);

export const workflowDslSchema = z.object({
  key: z.string(),
  name: z.string(),
  description: z.string().optional(),
  dslVersion: z.number().default(1),
  version: z.number().default(1),
  triggers: z.array(dslTriggerSchema).default([{ type: "manual" }]),
  defaults: z
    .object({
      maxRetries: z.number().default(2),
      timeoutMs: z.number().default(300000),
      onFailure: z.enum(["compensate", "fail", "ignore"]).default("compensate"),
      concurrencyPolicy: z.enum(["skip", "queue", "allow"]).default("allow"),
    })
    .default({
      maxRetries: 2,
      timeoutMs: 300000,
      onFailure: "compensate",
      concurrencyPolicy: "allow",
    }),
  steps: z.array(dslStepSchema).min(1, "Workflow must have at least one step."),
});

export type WorkflowDsl = z.infer<typeof workflowDslSchema>;
export type DslStep = z.infer<typeof dslStepSchema>;
