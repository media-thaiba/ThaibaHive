/**
 * Zod Validation Schemas for Zero-Trust & Supply Chain (ZASM)
 * Sprint-041 (ZASM)
 */

import { z } from 'zod';

export const deviceTrustOverrideSchema = z.object({
  forcedScore: z.number().min(0).max(100),
  reason: z.string().min(3, 'Justification reason is required'),
  ttlHours: z.number().min(1).max(168).optional().default(24),
});

export const segmentationPolicySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(3),
  description: z.string().optional(),
  priority: z.number().min(1).max(1000).default(100),
  action: z.enum(['ALLOW', 'DENY', 'QUARANTINE', 'STEP_UP_AUTH']),
  targetTrustTiers: z.array(z.enum(['HIGH_TRUST', 'MEDIUM_TRUST', 'LOW_TRUST', 'UNTRUSTED'])).min(1),
  sourceSubnets: z.array(z.string()).optional(),
  destServices: z.array(z.string()).optional(),
  protocols: z.array(z.enum(['TCP', 'UDP', 'ICMP', 'ALL'])).optional(),
  destPorts: z.array(z.number()).optional(),
  vlanTag: z.number().optional(),
  enabled: z.boolean().default(true),
  tenantId: z.string().optional(),
});

export const certificateRotateSchema = z.object({
  serviceName: z.string().min(1),
  reason: z.string().optional(),
});

export const certificateRevokeSchema = z.object({
  serialNumber: z.string().min(1),
  reason: z.enum(['KEY_COMPROMISE', 'CA_COMPROMISE', 'AFFILIATION_CHANGED', 'SUPERSEDED', 'CESSATION_OF_OPERATION', 'UNSPECIFIED']).default('UNSPECIFIED'),
});

export const sbomScanTriggerSchema = z.object({
  projectName: z.string().optional().default('ThaibaHive'),
  format: z.enum(['CycloneDX_JSON', 'SPDX_JSON']).optional().default('CycloneDX_JSON'),
});

export const forensicAnalysisTriggerSchema = z.object({
  signals: z.array(
    z.object({
      id: z.string(),
      sourceLayer: z.enum(['MTLS_MESH', 'DEVICE_TRUST', 'MICRO_SEGMENTATION', 'SOAR_PLAYBOOK', 'WAF_EDGE', 'AUTH_LOG', 'SBOM_SCAN']),
      targetActorOrEntity: z.string(),
      eventType: z.string(),
      severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']),
      details: z.record(z.string(), z.any()).optional().default({}),
      timestamp: z.string(),
    })
  ).min(1, 'At least one security signal required for forensic correlation'),
});
