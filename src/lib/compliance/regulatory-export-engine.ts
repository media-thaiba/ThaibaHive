import { SOC2_TEMPLATE, ComplianceTemplate } from "./templates/soc2";
import { ISO27001_TEMPLATE } from "./templates/iso27001";
import { GDPR_TEMPLATE } from "./templates/gdpr";
import { HIPAA_TEMPLATE } from "./templates/hipaa";
import { forensicSnapshotEngine } from "./forensic-snapshot-engine";
import { computeCanonicalChecksum, signSnapshotData } from "./snapshot-signer";
import { db } from "@/db";
import { auditLogs, auditMerkleRoots, complianceViolations } from "@thaiba/db/schema";
import { eq, desc, count } from "drizzle-orm";
import { verifyAuditChain } from "../audit/crypto-audit-engine";
import crypto from "crypto";

export interface RegulatoryExportPack {
  exportId: string;
  standard: "SOC2" | "ISO27001" | "GDPR" | "HIPAA";
  title: string;
  tenantId: string;
  generatedAt: string;
  systemVersion: string;
  template: ComplianceTemplate;
  executiveSummary: {
    overallStatus: "COMPLIANT" | "ACTION_REQUIRED";
    totalControlsEvaluated: number;
    auditIntegrityStatus: "VALID" | "CORRUPTED";
    totalAuditEntries: number;
    totalMerkleRoots: number;
    openViolationsCount: number;
  };
  evidenceData: {
    auditVerification: any;
    latestSnapshot: any;
    violationsSummary: any;
  };
  checksumSha256: string;
  digitalSignature: string;
  signerPublicKey: string;
}

export class RegulatoryExportEngine {
  getTemplate(standard: "SOC2" | "ISO27001" | "GDPR" | "HIPAA"): ComplianceTemplate {
    switch (standard) {
      case "SOC2":
        return SOC2_TEMPLATE;
      case "ISO27001":
        return ISO27001_TEMPLATE;
      case "GDPR":
        return GDPR_TEMPLATE;
      case "HIPAA":
        return HIPAA_TEMPLATE;
      default:
        return SOC2_TEMPLATE;
    }
  }

  /**
   * Generates a digitally signed compliance evidence dossier
   */
  async generateExportPack(params: {
    standard: "SOC2" | "ISO27001" | "GDPR" | "HIPAA";
    tenantId?: string;
  }): Promise<RegulatoryExportPack> {
    const tenantId = params.tenantId || "default";
    const template = this.getTemplate(params.standard);
    const exportId = `exp_${params.standard.toLowerCase()}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const generatedAt = new Date().toISOString();

    // 1. Audit logs & Merkle verification
    const recentAuditLogs = await db
      .select()
      .from(auditLogs)
      .where(tenantId !== "all" ? eq(auditLogs.tenantId, tenantId) : undefined)
      .orderBy(desc(auditLogs.timestamp))
      .limit(500);

    const auditVerification = verifyAuditChain(recentAuditLogs as any);

    let rootCount = 0;
    try {
      const rootRes = await db
        .select({ count: count() })
        .from(auditMerkleRoots)
        .where(tenantId !== "all" ? eq(auditMerkleRoots.tenantId, tenantId) : undefined);
      rootCount = rootRes[0]?.count ?? 0;
    } catch {
      rootCount = 0;
    }

    // 2. Latest Snapshot metadata
    const snapshotManifest = await forensicSnapshotEngine.captureSnapshot({
      tenantId,
      snapshotType: "AUDIT",
      metadata: { requestedForExport: exportId, standard: params.standard },
    });

    // 3. Violations summary
    const violations = await db
      .select()
      .from(complianceViolations)
      .where(tenantId !== "all" ? eq(complianceViolations.tenantId, tenantId) : undefined)
      .orderBy(desc(complianceViolations.createdAt))
      .limit(50);

    const openViolations = violations.filter((v) => v.status === "OPEN" || v.status === "ACKNOWLEDGED");

    const executiveSummary = {
      overallStatus: auditVerification.valid && openViolations.length === 0 ? ("COMPLIANT" as const) : ("ACTION_REQUIRED" as const),
      totalControlsEvaluated: template.controls.length,
      auditIntegrityStatus: auditVerification.status as "VALID" | "CORRUPTED",
      totalAuditEntries: recentAuditLogs.length,
      totalMerkleRoots: rootCount,
      openViolationsCount: openViolations.length,
    };

    const evidenceData = {
      auditVerification: {
        status: auditVerification.status,
        valid: auditVerification.valid,
        totalVerified: auditVerification.totalVerified,
        merkleRootsVerified: rootCount,
      },
      latestSnapshot: {
        id: snapshotManifest.id,
        checksum: snapshotManifest.checksumSha256,
        signature: snapshotManifest.signature,
        entityCounts: snapshotManifest.entityCounts,
      },
      violationsSummary: {
        total: violations.length,
        open: openViolations.length,
        recent: violations.slice(0, 5).map((v) => ({
          ruleId: v.ruleId,
          severity: v.severity,
          status: v.status,
          createdAt: v.createdAt,
        })),
      },
    };

    const rawPack = {
      exportId,
      standard: params.standard,
      title: template.title,
      tenantId,
      generatedAt,
      systemVersion: "3.20.0",
      template,
      executiveSummary,
      evidenceData,
    };

    const checksumSha256 = computeCanonicalChecksum(rawPack);
    const { signature, publicKey } = signSnapshotData(checksumSha256);

    return {
      ...rawPack,
      checksumSha256,
      digitalSignature: signature,
      signerPublicKey: publicKey,
    };
  }
}

export const regulatoryExportEngine = new RegulatoryExportEngine();
