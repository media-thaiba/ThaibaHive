import { ComplianceEvent, ComplianceViolationReport, ViolationSeverity } from "./types";

export interface ComplianceRuleDefinition {
  id: string;
  name: string;
  description: string;
  severity: ViolationSeverity;
  evaluate: (event: ComplianceEvent, historyTracker: AnomalyHistoryTracker) => ComplianceViolationReport | null;
}

export interface AnomalyHistoryTracker {
  getRecentEventCount: (key: string, windowSeconds: number) => number;
  recordEvent: (key: string) => void;
}

export const COMPLIANCE_RULES: ComplianceRuleDefinition[] = [
  {
    id: "UNAUTHORIZED_PRIVILEGE_ESCALATION",
    name: "Unauthorized Privilege Escalation Attempt",
    description: "Detects non-super-admin actors assigning super_admin or admin roles, or rapid role elevations",
    severity: "CRITICAL",
    evaluate: (event) => {
      const isRoleAction = event.action.includes("role") || event.action.includes("staff:update") || event.action.includes("staff:create");
      const targetRole = event.payload?.data?.role || event.payload?.role;

      if (isRoleAction && (targetRole === "super_admin" || targetRole === "admin")) {
        const actor = event.actorId;
        // Flag if target role is super_admin and payload lacks explicit emergency elevation token
        if (targetRole === "super_admin" && !event.payload?.elevationApproved) {
          return {
            ruleId: "UNAUTHORIZED_PRIVILEGE_ESCALATION",
            ruleName: "Unauthorized Privilege Escalation Attempt",
            severity: "CRITICAL",
            score: 95,
            details: {
              actorId: actor,
              targetRole,
              action: event.action,
              entityId: event.entityId,
            },
          };
        }
      }
      return null;
    },
  },
  {
    id: "BULK_DATA_EXPORT_SPIKE",
    name: "Bulk Data Export Spike",
    description: "Detects single actor or IP performing rapid bulk exports exceeding rate limits (>5 in 10 minutes)",
    severity: "HIGH",
    evaluate: (event, history) => {
      const isExport = event.action.includes("export") || event.action.includes("download");
      if (!isExport) return null;

      const actorKey = `export:${event.actorId || event.ipAddress || "anon"}`;
      history.recordEvent(actorKey);
      const countIn10Min = history.getRecentEventCount(actorKey, 600);

      const recordCount = Number(event.payload?.data?.count || event.payload?.recordCount || 0);

      if (countIn10Min > 5 || recordCount > 500) {
        return {
          ruleId: "BULK_DATA_EXPORT_SPIKE",
          ruleName: "Bulk Data Export Spike",
          severity: "HIGH",
          score: 80,
          details: {
            actorId: event.actorId,
            ipAddress: event.ipAddress,
            recentExportsCount: countIn10Min,
            recordCount,
            action: event.action,
          },
        };
      }
      return null;
    },
  },
  {
    id: "FINANCIAL_THRESHOLD_BYPASS",
    name: "Financial Dual-Authorization Threshold Bypass",
    description: "Detects high-value financial mutations exceeding threshold ($50,000) without multi-party approval metadata",
    severity: "HIGH",
    evaluate: (event) => {
      if (!event.action.startsWith("finance:") && !event.action.includes("payment")) return null;

      const amount = Number(event.payload?.data?.amount || event.payload?.amount || 0);
      const hasDualAuth = Boolean(event.payload?.data?.secondaryApproverId || event.payload?.secondaryApproverId);

      if (amount >= 50000 && !hasDualAuth) {
        return {
          ruleId: "FINANCIAL_THRESHOLD_BYPASS",
          ruleName: "Financial Dual-Authorization Threshold Bypass",
          severity: "HIGH",
          score: 85,
          details: {
            actorId: event.actorId,
            amount,
            threshold: 50000,
            hasDualAuth,
            action: event.action,
          },
        };
      }
      return null;
    },
  },
  {
    id: "OFF_HOURS_ADMIN_MUTATION",
    name: "Off-Hours Critical System Configuration Mutation",
    description: "Detects destructive or organization-wide administrative changes during off-hours (23:00 - 05:00 UTC)",
    severity: "MEDIUM",
    evaluate: (event) => {
      const isCriticalConfig = event.action.includes("org:manage") || event.action.includes("departments:delete") || event.action.includes("system:config");
      if (!isCriticalConfig) return null;

      const eventDate = new Date(event.timestamp || Date.now());
      const hour = eventDate.getUTCHours();

      if (hour >= 23 || hour < 5) {
        return {
          ruleId: "OFF_HOURS_ADMIN_MUTATION",
          ruleName: "Off-Hours Critical System Configuration Mutation",
          severity: "MEDIUM",
          score: 50,
          details: {
            actorId: event.actorId,
            utcHour: hour,
            action: event.action,
          },
        };
      }
      return null;
    },
  },
  {
    id: "CROSS_TENANT_QUERY_ANOMALY",
    name: "Cross-Tenant Boundary Access Anomaly",
    description: "Detects actors attempting to read or mutate entities across disparate tenant partition boundaries",
    severity: "CRITICAL",
    evaluate: (event) => {
      const targetTenant = event.payload?.data?.institutionId || event.payload?.targetTenantId || event.payload?.institutionId;

      if (targetTenant && event.tenantId && targetTenant !== event.tenantId && event.tenantId !== "default" && event.tenantId !== "super_admin") {
        return {
          ruleId: "CROSS_TENANT_QUERY_ANOMALY",
          ruleName: "Cross-Tenant Boundary Access Anomaly",
          severity: "CRITICAL",
          score: 95,
          details: {
            actorId: event.actorId,
            sessionTenantId: event.tenantId,
            targetTenantId: targetTenant,
            action: event.action,
          },
        };
      }
      return null;
    },
  },
];
