/**
 * Zero-Trust & Supply Chain Cryptographic Merkle Audit Logger
 * Sprint-041 (ZASM)
 */

import { cryptoAuditWriter } from '../../audit/crypto-writer';
import { IssuedCertificate, RevocationRecord } from '../pki/pki-types';
import { DeviceTrustScore, TrustOverride } from '../trust/trust-types';
import { SegmentationPolicyRule } from '../segmentation/segmentation-types';
import { SbomScanResult } from '../sbom/sbom-types';
import { ForensicInvestigationReport } from '../forensics/forensic-types';

export class ZasmAuditLogger {
  /**
   * Log mTLS certificate issuance to Merkle audit chain
   */
  public static async logCertIssued(cert: IssuedCertificate, tenantId = 'global'): Promise<void> {
    try {
      await cryptoAuditWriter.log({
        tenantId,
        userId: 'system:pki_ca',
        action: 'ZASM_CERT_ISSUED',
        entityType: 'ZASM_CERTIFICATE',
        entityId: cert.serialNumber,
        payload: {
          serial_number: cert.serialNumber,
          common_name: cert.subject.commonName,
          type: cert.type,
          fingerprint_sha256: cert.fingerprintSha256,
          valid_to: cert.validTo,
        },
        timestamp: cert.validFrom,
      });
      await cryptoAuditWriter.flush();
    } catch {}
  }

  /**
   * Log certificate revocation
   */
  public static async logCertRevoked(revocation: RevocationRecord, tenantId = 'global'): Promise<void> {
    try {
      await cryptoAuditWriter.log({
        tenantId,
        userId: revocation.revokedBy,
        action: 'ZASM_CERT_REVOKED',
        entityType: 'ZASM_CERTIFICATE',
        entityId: revocation.serialNumber,
        payload: {
          serial_number: revocation.serialNumber,
          reason: revocation.reason,
        },
        timestamp: revocation.revokedAt,
      });
      await cryptoAuditWriter.flush();
    } catch {}
  }

  /**
   * Log device trust evaluation
   */
  public static async logTrustEvaluated(score: DeviceTrustScore): Promise<void> {
    try {
      await cryptoAuditWriter.log({
        tenantId: score.tenantId || 'global',
        userId: 'system:trust_evaluator',
        action: 'ZASM_TRUST_EVALUATED',
        entityType: 'ZASM_DEVICE_TRUST',
        entityId: score.deviceId,
        payload: {
          device_id: score.deviceId,
          score: score.score,
          tier: score.tier,
          penalties: score.penaltiesApplied,
        },
        timestamp: score.evaluatedAt,
      });
      await cryptoAuditWriter.flush();
    } catch {}
  }

  /**
   * Log manual device trust override
   */
  public static async logTrustOverridden(override: TrustOverride): Promise<void> {
    try {
      await cryptoAuditWriter.log({
        tenantId: override.tenantId || 'global',
        userId: override.appliedBy,
        action: 'ZASM_TRUST_OVERRIDDEN',
        entityType: 'ZASM_DEVICE_TRUST',
        entityId: override.deviceId,
        payload: {
          device_id: override.deviceId,
          forced_score: override.forcedScore,
          forced_tier: override.forcedTier,
          reason: override.reason,
          expires_at: override.expiresAt,
        },
        timestamp: override.createdAt,
      });
      await cryptoAuditWriter.flush();
    } catch {}
  }

  /**
   * Log micro-segmentation policy compilation/application
   */
  public static async logPolicyApplied(policy: SegmentationPolicyRule, tenantId = 'global'): Promise<void> {
    try {
      await cryptoAuditWriter.log({
        tenantId,
        userId: 'system:policy_engine',
        action: 'ZASM_POLICY_APPLIED',
        entityType: 'ZASM_SEGMENTATION_POLICY',
        entityId: policy.id,
        payload: {
          policy_id: policy.id,
          name: policy.name,
          priority: policy.priority,
          action: policy.action,
          target_tiers: policy.targetTrustTiers,
          vlan_tag: policy.vlanTag,
        },
        timestamp: new Date().toISOString(),
      });
      await cryptoAuditWriter.flush();
    } catch {}
  }

  /**
   * Log SBOM vulnerability scan
   */
  public static async logSbomScanned(result: SbomScanResult, tenantId = 'global'): Promise<void> {
    try {
      await cryptoAuditWriter.log({
        tenantId,
        userId: 'system:sbom_scanner',
        action: 'ZASM_SBOM_SCANNED',
        entityType: 'ZASM_SBOM_SCAN',
        entityId: result.scanId,
        payload: {
          scan_id: result.scanId,
          total_packages: result.totalPackagesScanned,
          vulnerable_packages: result.vulnerablePackageCount,
          critical_count: result.criticalCount,
          high_count: result.highCount,
        },
        timestamp: result.timestamp,
      });
      await cryptoAuditWriter.flush();
    } catch {}
  }

  /**
   * Log forensic investigation report generation
   */
  public static async logForensicReportGenerated(report: ForensicInvestigationReport, tenantId = 'global'): Promise<void> {
    try {
      await cryptoAuditWriter.log({
        tenantId,
        userId: 'system:forensic_copilot',
        action: 'ZASM_FORENSIC_REPORT_GENERATED',
        entityType: 'ZASM_FORENSIC_REPORT',
        entityId: report.reportId,
        payload: {
          report_id: report.reportId,
          incident_id: report.incidentId,
          primary_actor: report.primaryActor,
          stages_count: report.timeline.length,
          duration_ms: report.durationMs,
        },
        timestamp: report.generatedAt,
      });
      await cryptoAuditWriter.flush();
    } catch {}
  }
}
