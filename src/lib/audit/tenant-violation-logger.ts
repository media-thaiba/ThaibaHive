import { db, auditLogs } from "@thaiba/db";
import crypto from "crypto";

interface TenantViolationEvent {
  errorCode: "TENANT_MISMATCH" | "TENANT_ISOLATION" | "UNMAPPED_SCOPE" | "CROSS_PARTITION";
  severity: "HIGH" | "CRITICAL";
  staffRole: string;
  requestedInstitutionId?: string | null;
  resolvedInstitutionId?: string | null;
  hostOrSubdomain?: string | null;
  routePath: string;
  method: string;
  ipAddress: string | null;
  userAgent: string | null;
  errorMessage?: string;
}

/**
 * Hashes an identifier with a per-tenant secret so the same staffId
 * produces different hashes in different tenants (prevents correlation).
 */
function hashIdentifier(identifier: string, tenantId: string): string {
  const secret = process.env.AUDIT_HASH_SECRET || "default";
  return crypto
    .createHmac("sha256", secret)
    .update(`${tenantId}:${identifier}`)
    .digest("hex")
    .substring(0, 16);
}

export async function logTenantViolation(
  event: TenantViolationEvent,
  session: { staffId: string; role: string; institutionId?: string | null }
): Promise<void> {
  const tenantId = session.institutionId || "global";
  const hashedStaffId = hashIdentifier(session.staffId, tenantId);

  const payload: Record<string, unknown> = {
    errorCode: event.errorCode,
    severity: event.severity,
    staffRole: event.staffRole,
    routePath: event.routePath,
    method: event.method,
  };

  if (event.requestedInstitutionId) {
    payload.requestedInstitutionId = hashIdentifier(event.requestedInstitutionId, tenantId);
  }
  if (event.resolvedInstitutionId) {
    payload.resolvedInstitutionId = hashIdentifier(event.resolvedInstitutionId, tenantId);
  }
  if (event.hostOrSubdomain) {
    payload.hostOrSubdomain = event.hostOrSubdomain;
  }
  if (event.errorMessage) {
    payload.errorMessage = event.errorMessage;
  }

  const payloadJson = JSON.stringify(payload);
  const id = `audit_${crypto.randomBytes(12).toString("hex")}`;
  // Merkle chain hash: hash of (id + payload) serves as currentHash
  const currentHash = crypto
    .createHmac("sha256", process.env.AUDIT_HASH_SECRET || "default")
    .update(`${id}:${payloadJson}`)
    .digest("hex");

  try {
    await db.insert(auditLogs).values({
      id,
      tenantId,
      userId: hashedStaffId,
      action: `tenant_violation_${event.errorCode.toLowerCase()}`,
      entityType: "security_event",
      entityId: null,
      payload: payloadJson,
      currentHash,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
    }).run();
  } catch (err) {
    console.error("[audit] Failed to write tenant violation log:", err);
  }
}