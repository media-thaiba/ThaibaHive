import { NextResponse } from "next/server";
import { cryptoAuditWriter } from "./crypto-writer";
import { auditAnomalyDetector } from "../compliance/anomaly-detector";

export interface AuditMiddlewareOptions {
  action: string;
  entityType: string;
  getEntityId?: (req: Request, res: NextResponse, body?: any) => string | undefined;
  extractPayload?: (req: Request, res: NextResponse, body?: any) => any;
}

/**
 * Higher-order function wrapping Next.js route handlers with cryptographic audit logging
 */
export function withCryptoAudit(
  handler: (req: Request, session?: any, context?: any) => Promise<NextResponse>,
  options: AuditMiddlewareOptions
) {
  return async function (req: Request, session?: any, context?: any): Promise<NextResponse> {
    const startTime = Date.now();
    let requestBody: any = null;

    // Clone request to read body if present without consuming stream
    if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
      try {
        const clone = req.clone();
        requestBody = await clone.json();
      } catch {
        // Non-JSON body or empty body
      }
    }

    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "unknown";
    const tenantId = req.headers.get("x-tenant-id") || session?.institutionId || "default";
    const userId = session?.userId || session?.sub || session?.id || "anonymous";

    const response = await handler(req, session, context);

    // Only log mutations or configured actions if response is successful (< 400) or unauthorized/forbidden
    const status = response.status;
    const entityId = options.getEntityId ? options.getEntityId(req, response, requestBody) : undefined;
    const payload = options.extractPayload ? options.extractPayload(req, response, requestBody) : requestBody;

    const auditEntry = {
      tenantId,
      userId,
      action: options.action,
      entityType: options.entityType,
      entityId,
      payload: {
        method: req.method,
        url: req.url,
        status,
        durationMs: Date.now() - startTime,
        data: payload,
      },
      ipAddress,
      userAgent,
      timestamp: new Date().toISOString(),
    };

    // Asynchronously log without blocking response stream
    cryptoAuditWriter.log(auditEntry).catch((err) => {
      console.error("[@thaiba/audit] withCryptoAudit async logging failed:", err);
    });

    // Real-time compliance anomaly detection evaluation
    try {
      auditAnomalyDetector.evaluate({
        tenantId,
        actorId: userId,
        action: options.action,
        entityType: options.entityType,
        entityId,
        ipAddress,
        userAgent,
        payload,
        timestamp: auditEntry.timestamp,
      });
    } catch (anomErr) {
      console.warn("[@thaiba/audit] Anomaly evaluation failed:", anomErr);
    }

    return response;
  };
}
