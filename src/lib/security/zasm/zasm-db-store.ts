/**
 * Dual-Store Database Persistence for Zero-Trust & Supply Chain Entities
 * Sprint-041 (ZASM)
 */

import { db } from '@/db';
import {
  zasmDeviceTrust,
  zasmSegmentationPolicies,
  zasmCertificates,
  zasmSbomPackages,
  zasmSbomVulnerabilities,
  zasmForensicReports,
} from '@thaiba/db';
import { eq, desc } from 'drizzle-orm';
import { DeviceTrustScore } from '../trust/trust-types';
import { SegmentationPolicyRule } from '../segmentation/segmentation-types';
import { IssuedCertificate } from '../pki/pki-types';
import { SbomScanResult } from '../sbom/sbom-types';
import { ForensicInvestigationReport } from '../forensics/forensic-types';

export class ZasmDbStore {
  /**
   * Persists or updates a device trust evaluation
   */
  public static async saveDeviceTrust(score: DeviceTrustScore): Promise<void> {
    try {
      const id = `dt-${score.deviceId}`;
      const existing = await db
        .select()
        .from(zasmDeviceTrust)
        .where(eq(zasmDeviceTrust.id, id))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(zasmDeviceTrust)
          .set({
            score: score.score,
            tier: score.tier,
            factorBreakdown: JSON.stringify(score.factorBreakdown),
            penalties: JSON.stringify(score.penaltiesApplied),
            isOverridden: score.isOverridden,
            overrideReason: score.overrideReason,
            evaluatedAt: score.evaluatedAt,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(zasmDeviceTrust.id, id));
      } else {
        await db.insert(zasmDeviceTrust).values({
          id,
          deviceId: score.deviceId,
          tenantId: score.tenantId,
          score: score.score,
          tier: score.tier,
          factorBreakdown: JSON.stringify(score.factorBreakdown),
          penalties: JSON.stringify(score.penaltiesApplied),
          isOverridden: score.isOverridden,
          overrideReason: score.overrideReason,
          evaluatedAt: score.evaluatedAt,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      // Non-blocking database write error handling
    }
  }

  /**
   * Lists all persisted device trust records
   */
  public static async listDeviceTrusts(): Promise<any[]> {
    try {
      return await db.select().from(zasmDeviceTrust).orderBy(desc(zasmDeviceTrust.evaluatedAt));
    } catch {
      return [];
    }
  }

  /**
   * Persists or updates a micro-segmentation policy
   */
  public static async savePolicy(policy: SegmentationPolicyRule): Promise<void> {
    try {
      const existing = await db
        .select()
        .from(zasmSegmentationPolicies)
        .where(eq(zasmSegmentationPolicies.id, policy.id))
        .limit(1);

      const payload = {
        name: policy.name,
        description: policy.description,
        priority: policy.priority,
        action: policy.action,
        targetTrustTiers: JSON.stringify(policy.targetTrustTiers),
        sourceSubnets: policy.sourceSubnets ? JSON.stringify(policy.sourceSubnets) : null,
        destServices: policy.destServices ? JSON.stringify(policy.destServices) : null,
        protocols: policy.protocols ? JSON.stringify(policy.protocols) : null,
        destPorts: policy.destPorts ? JSON.stringify(policy.destPorts) : null,
        vlanTag: policy.vlanTag,
        enabled: policy.enabled,
        tenantId: policy.tenantId || 'global',
        updatedAt: new Date().toISOString(),
      };

      if (existing.length > 0) {
        await db
          .update(zasmSegmentationPolicies)
          .set(payload)
          .where(eq(zasmSegmentationPolicies.id, policy.id));
      } else {
        await db.insert(zasmSegmentationPolicies).values({
          id: policy.id,
          ...payload,
          createdAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      // Non-blocking
    }
  }

  /**
   * Lists all segmentation policies
   */
  public static async listPolicies(): Promise<any[]> {
    try {
      return await db.select().from(zasmSegmentationPolicies).orderBy(zasmSegmentationPolicies.priority);
    } catch {
      return [];
    }
  }

  /**
   * Deletes a policy
   */
  public static async deletePolicy(policyId: string): Promise<void> {
    try {
      await db.delete(zasmSegmentationPolicies).where(eq(zasmSegmentationPolicies.id, policyId));
    } catch {}
  }

  /**
   * Persists an issued certificate
   */
  public static async saveCertificate(cert: IssuedCertificate, serviceName: string): Promise<void> {
    try {
      await db.insert(zasmCertificates).values({
        id: `cert-${cert.serialNumber}`,
        serialNumber: cert.serialNumber,
        serviceName,
        type: cert.type,
        certificatePem: cert.certificatePem,
        publicKeyPem: cert.publicKeyPem,
        fingerprintSha256: cert.fingerprintSha256,
        sanList: JSON.stringify(cert.sanList),
        validFrom: cert.validFrom,
        validTo: cert.validTo,
        isRevoked: false,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      // Non-blocking
    }
  }

  /**
   * Marks a certificate as revoked
   */
  public static async markCertificateRevoked(serialNumber: string, reason: string): Promise<void> {
    try {
      await db
        .update(zasmCertificates)
        .set({
          isRevoked: true,
          revocationReason: reason,
          revokedAt: new Date().toISOString(),
        })
        .where(eq(zasmCertificates.serialNumber, serialNumber));
    } catch (err) {
      // Non-blocking
    }
  }

  /**
   * Lists all certificates
   */
  public static async listCertificates(): Promise<any[]> {
    try {
      return await db.select().from(zasmCertificates).orderBy(desc(zasmCertificates.createdAt));
    } catch {
      return [];
    }
  }

  /**
   * Persists SBOM scan results
   */
  public static async saveSbomScan(result: SbomScanResult): Promise<void> {
    try {
      for (const item of result.vulnerabilities) {
        for (const v of item.vulnerabilities) {
          await db.insert(zasmSbomVulnerabilities).values({
            id: `vuln-${result.scanId}-${v.id}-${item.package.name}`,
            cveId: v.id,
            packageName: item.package.name,
            affectedVersions: v.affectedVersions,
            patchedVersion: v.patchedVersion,
            severity: v.severity,
            cvssScore: v.cvssScore,
            summary: v.summary,
            publishedAt: v.publishedAt,
            advisoryUrl: v.advisoryUrl,
            status: 'OPEN',
            detectedAt: result.timestamp,
          });
        }
      }
    } catch (err) {
      // Non-blocking
    }
  }

  /**
   * Lists detected vulnerabilities
   */
  public static async listVulnerabilities(): Promise<any[]> {
    try {
      return await db.select().from(zasmSbomVulnerabilities).orderBy(desc(zasmSbomVulnerabilities.detectedAt));
    } catch {
      return [];
    }
  }

  /**
   * Persists a forensic investigation report
   */
  public static async saveForensicReport(report: ForensicInvestigationReport): Promise<void> {
    try {
      await db.insert(zasmForensicReports).values({
        id: report.reportId,
        incidentId: report.incidentId,
        primaryActor: report.primaryActor,
        executiveSummary: report.executiveSummary,
        technicalDetails: report.technicalDetails,
        timeline: JSON.stringify(report.timeline),
        rootCauseGraph: JSON.stringify(report.rootCauseGraph),
        durationMs: report.durationMs,
        generatedAt: report.generatedAt,
      });
    } catch (err) {
      // Non-blocking
    }
  }

  /**
   * Lists forensic reports
   */
  public static async listForensicReports(): Promise<any[]> {
    try {
      return await db.select().from(zasmForensicReports).orderBy(desc(zasmForensicReports.generatedAt));
    } catch {
      return [];
    }
  }
}
