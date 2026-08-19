/**
 * Threat Intelligence Validation Schemas
 * Sprint-039 / TIF-012
 */

import { z } from "zod";

export const stixIndicatorSchema = z.object({
  id: z.string().optional(),
  type: z.literal("indicator"),
  pattern: z.string().min(3),
  valid_from: z.string().optional(),
  valid_until: z.string().optional(),
  confidence: z.number().min(0).max(100).optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  labels: z.array(z.string()).optional(),
}).passthrough();

export const stixBundleSchema = z.object({
  id: z.string().optional(),
  type: z.literal("bundle"),
  objects: z.array(z.record(z.string(), z.unknown())),
});

export const addThreatFeedSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  url: z.string().url("Must be a valid URL"),
  authType: z.enum(["none", "basic", "bearer", "api-key"]).default("none"),
  username: z.string().optional(),
  password: z.string().optional(),
  token: z.string().optional(),
  pollIntervalMinutes: z.number().min(5).max(1440).default(60),
  autoQuarantineConfidenceThreshold: z.number().min(50).max(100).default(80),
});
