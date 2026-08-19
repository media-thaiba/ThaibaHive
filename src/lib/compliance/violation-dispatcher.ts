import { db } from "@/db";
import { complianceViolations } from "@thaiba/db/schema";
import { ComplianceEvent, ComplianceViolationReport, ComplianceViolationRecord } from "./types";
import { complianceMetrics } from "../observability/compliance-metrics";
import crypto from "crypto";

export class ViolationDispatcher {
  private deduplicationCache: Map<string, number> = new Map();
  private dedupWindowMs = 5 * 60 * 1000; // 5 minutes

  /**
   * Persists, deduplicates, and dispatches real-time compliance violation alerts
   */
  async dispatch(event: ComplianceEvent, report: ComplianceViolationReport): Promise<ComplianceViolationRecord | null> {
    const dedupKey = `${event.tenantId}:${report.ruleId}:${event.actorId || event.ipAddress || "anon"}`;
    const now = Date.now();

    // Deduplicate alerts within 5 minutes
    if (this.deduplicationCache.has(dedupKey)) {
      const lastAlerted = this.deduplicationCache.get(dedupKey)!;
      if (now - lastAlerted < this.dedupWindowMs) {
        return null;
      }
    }
    this.deduplicationCache.set(dedupKey, now);

    const violationId = `vio_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const timestamp = new Date().toISOString();

    const record: ComplianceViolationRecord = {
      id: violationId,
      tenantId: event.tenantId,
      ruleId: report.ruleId,
      severity: report.severity,
      actorId: event.actorId || null,
      entityType: event.entityType || null,
      entityId: event.entityId || null,
      details: {
        ...report.details,
        ruleName: report.ruleName,
        score: report.score,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        timestamp: event.timestamp,
      },
      status: "OPEN",
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    // Increment metrics
    complianceMetrics.recordViolation(report.severity, report.ruleId);

    // Save to DB
    try {
      await db.insert(complianceViolations).values({
        id: record.id,
        tenantId: record.tenantId,
        ruleId: record.ruleId,
        severity: record.severity,
        actorId: record.actorId,
        entityType: record.entityType,
        entityId: record.entityId,
        details: JSON.stringify(record.details),
        status: record.status,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      });
    } catch (err) {
      console.warn("[@thaiba/compliance] Failed to persist violation to database:", err);
    }

    // High / Critical Alert trigger logging
    if (report.severity === "CRITICAL" || report.severity === "HIGH") {
      console.warn(`[COMPLIANCE_ALERT] [${report.severity}] ${report.ruleName} for tenant ${event.tenantId} by actor ${event.actorId}`);
    }

    return record;
  }

  clearDedup() {
    this.deduplicationCache.clear();
  }
}

export const violationDispatcher = new ViolationDispatcher();
