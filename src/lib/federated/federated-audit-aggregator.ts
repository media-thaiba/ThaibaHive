export type AuditSeverity = "INFO" | "WARNING" | "CRITICAL" | "AUDIT";

export interface FederatedAuditEntry {
  id: string;
  tenantId: string;
  institutionId?: string;
  action: string;
  actorId: string;
  severity: AuditSeverity;
  details: Record<string, any>;
  anonymized: boolean;
  loggedAt: string;
}

export interface AuditQueryFilter {
  tenantId?: string;
  institutionId?: string;
  severity?: AuditSeverity;
  actorId?: string;
  startDate?: string;
  endDate?: string;
  anonymizedOnly?: boolean;
}

export class FederatedAuditAggregator {
  private auditLogs: FederatedAuditEntry[] = [];

  public recordAuditLog(
    tenantId: string,
    action: string,
    actorId: string,
    severity: AuditSeverity = "INFO",
    details: Record<string, any> = {},
    institutionId?: string,
    anonymize: boolean = false
  ): FederatedAuditEntry {
    const entry: FederatedAuditEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tenantId,
      institutionId,
      action,
      actorId: anonymize ? this.maskActorId(actorId) : actorId,
      severity,
      details: anonymize ? this.maskSensitiveDetails(details) : details,
      anonymized: anonymize,
      loggedAt: new Date().toISOString(),
    };

    this.auditLogs.push(entry);
    return entry;
  }

  public queryAuditLogs(filter: AuditQueryFilter = {}): FederatedAuditEntry[] {
    return this.auditLogs.filter((log) => {
      if (filter.tenantId && log.tenantId !== filter.tenantId) return false;
      if (filter.institutionId && log.institutionId !== filter.institutionId) return false;
      if (filter.severity && log.severity !== filter.severity) return false;
      if (filter.actorId && log.actorId !== filter.actorId) return false;
      if (filter.anonymizedOnly && !log.anonymized) return false;
      if (filter.startDate && new Date(log.loggedAt) < new Date(filter.startDate)) return false;
      if (filter.endDate && new Date(log.loggedAt) > new Date(filter.endDate)) return false;
      return true;
    });
  }

  public aggregateComplianceReport(tenantIds?: string[]): {
    totalEvents: number;
    severityCounts: Record<AuditSeverity, number>;
    tenantBreakdown: Record<string, number>;
  } {
    const logs = tenantIds
      ? this.auditLogs.filter((l) => tenantIds.includes(l.tenantId))
      : this.auditLogs;

    const severityCounts: Record<AuditSeverity, number> = {
      INFO: 0,
      WARNING: 0,
      CRITICAL: 0,
      AUDIT: 0,
    };
    const tenantBreakdown: Record<string, number> = {};

    for (const log of logs) {
      severityCounts[log.severity] = (severityCounts[log.severity] || 0) + 1;
      tenantBreakdown[log.tenantId] = (tenantBreakdown[log.tenantId] || 0) + 1;
    }

    return {
      totalEvents: logs.length,
      severityCounts,
      tenantBreakdown,
    };
  }

  /** Public PII masker — masks email addresses and personal identifiers */
  public maskPII(value: string): string {
    if (!value) return "***";
    // Mask email: keep first 2 chars of local part, then ***@domain
    const emailRegex = /^([^@]{1,2})[^@]*(@.+)$/;
    const emailMatch = value.match(emailRegex);
    if (emailMatch) {
      return `${emailMatch[1]}***${emailMatch[2]}`;
    }
    // Generic masking for non-email
    if (value.length <= 4) return "****";
    return `${value.slice(0, 2)}***${value.slice(-1)}`;
  }

  /** Return only audit logs belonging to a specific institution (tenant isolation) */
  public async aggregateByInstitution(institutionId: string): Promise<FederatedAuditEntry[]> {
    return this.auditLogs.filter((log) => log.institutionId === institutionId);
  }

  private maskActorId(actorId: string): string {
    if (actorId.length <= 4) return "****";
    return `${actorId.slice(0, 3)}***${actorId.slice(-2)}`;
  }

  private maskSensitiveDetails(details: Record<string, any>): Record<string, any> {
    const masked = { ...details };
    const sensitiveKeys = ["email", "phone", "ssn", "nationalId", "password", "salary"];
    for (const key of Object.keys(masked)) {
      if (sensitiveKeys.includes(key.toLowerCase())) {
        masked[key] = "[REDACTED]";
      }
    }
    return masked;
  }
}
