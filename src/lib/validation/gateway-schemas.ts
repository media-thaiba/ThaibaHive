/**
 * Zod Validation Schemas for Gateway API
 * Sprint-038 / AGS-012
 */

import { z } from "zod";

export const CreateQuarantineSchema = z.object({
  ipAddress: z.string().min(1, "IP address is required"),
  cidrMask: z.enum(["/32", "/24"]).optional().default("/32"),
  reason: z.string().min(3, "Reason must be at least 3 characters"),
  durationMinutes: z.number().int().min(1).max(10080).optional().default(60), // up to 7 days
  tenantId: z.string().optional().default("default"),
});

export const AllowlistIpSchema = z.object({
  ipAddress: z.string().min(1, "IP address is required"),
  description: z.string().min(3, "Description is required"),
  tenantId: z.string().optional().default("default"),
});

export const CircuitBreakerOverrideSchema = z.object({
  action: z.enum(["TRIP", "RESET"]),
  reason: z.string().optional(),
});
