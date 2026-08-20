/**
 * Zod Validation Schemas for ARES & Chaos Mesh
 * Sprint-042 (ARES) — ARES-020
 */

import { z } from 'zod';

export const threatForecastTriggerSchema = z.object({
  category: z.enum([
    'CREDENTIAL_STUFFING',
    'ZERO_DAY_EXPLOIT',
    'LATERAL_MOVEMENT',
    'DATA_EXFILTRATION',
    'SUPPLY_CHAIN_POISONING',
    'DISTRIBUTED_DENIAL_OF_SERVICE',
    'RANSOMWARE_IMPACT',
    'PRIVILEGE_ESCALATION',
  ]),
  evidenceSignals: z
    .array(
      z.object({
        signalId: z.string(),
        source: z.string(),
        signalType: z.string(),
        weight: z.number().min(0).max(1),
        observedValue: z.number().min(0).max(1),
        timestamp: z.string().optional(),
        metadata: z.record(z.string(), z.any()).optional(),
      })
    )
    .optional()
    .default([]),
  affectedAssetIds: z.array(z.string()).optional().default(['primary-cluster']),
});

export const chaosExperimentRunSchema = z.object({
  scenarioId: z.string().min(1, 'Scenario ID is required'),
});

export const chaosKillSwitchTriggerSchema = z.object({
  reason: z.string().min(3, 'Abort reason is required'),
});

export const zkpGenerateProofSchema = z.object({
  merkleRoot: z.string().min(10, 'Valid Merkle root is required'),
  auditRecordPreimage: z.string().min(1, 'Audit record preimage is required'),
  tenantId: z.string().optional().default('tenant-master'),
});

export const zkpVerifyAttestationSchema = z.object({
  proofId: z.string().optional(),
  proofPayload: z.any().optional(),
  complianceFramework: z.enum(['SOC2_TYPE_II', 'GDPR', 'HIPAA', 'ISO_27001']).optional().default('SOC2_TYPE_II'),
});

export const attackPathQuerySchema = z.object({
  sourceId: z.string().min(1, 'Source threat node ID is required'),
  targetId: z.string().min(1, 'Target asset ID is required'),
});
