/**
 * SOAR Zod Validation Schemas
 * Sprint-040 — Request & Model Validation
 */

import { z } from 'zod';

export const PlaybookConditionLeafSchema: z.ZodType<any> = z.object({
  field: z.string().min(1),
  operator: z.enum([
    '==',
    '!=',
    '>',
    '>=',
    '<',
    '<=',
    'in',
    'not_in',
    'contains',
    'regex_match',
    'cidr_match',
  ]),
  value: z.any(),
});

export const PlaybookConditionSchema: z.ZodType<any> = z.lazy(() =>
  z.union([
    PlaybookConditionLeafSchema,
    z.object({
      and: z.array(PlaybookConditionSchema).optional(),
      or: z.array(PlaybookConditionSchema).optional(),
      not: PlaybookConditionSchema.optional(),
    }),
  ])
);

export const PlaybookTriggerSchema = z.object({
  event_type: z.string().min(1),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  source: z.string().optional(),
  confidence_min: z.number().min(0).max(100).optional(),
  condition: PlaybookConditionSchema.optional(),
});

export const PlaybookStepSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  action: z.string().min(1),
  params: z.record(z.string(), z.any()).optional(),
  condition: PlaybookConditionSchema.optional(),
  timeout_ms: z.number().min(100).max(60000).optional(),
  continue_on_error: z.boolean().optional(),
});

export const SecurityPlaybookSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  version: z.string().min(1),
  description: z.string().optional(),
  category: z.enum(['NETWORK', 'IDENTITY', 'DDOS', 'THREAT_INTEL', 'SYSTEM']),
  enabled: z.boolean(),
  auto_execute: z.boolean(),
  min_confidence: z.number().min(0).max(100),
  high_impact: z.boolean().optional(),
  triggers: z.array(PlaybookTriggerSchema).min(1),
  steps: z.array(PlaybookStepSchema).min(1),
  rollback_strategy: z.enum(['COMPENSATE', 'NONE']).optional(),
});

export const ManualTriggerRequestSchema = z.object({
  playbook_id: z.string().min(1),
  target_type: z.enum(['IP', 'SUBNET', 'USER', 'DOMAIN', 'TOKEN']),
  target_value: z.string().min(1),
  payload: z.record(z.string(), z.any()).optional().default({}),
});

export const ResolveApprovalRequestSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  reason: z.string().optional(),
});
