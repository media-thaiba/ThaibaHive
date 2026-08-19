/**
 * Edge Security Webhook Ingestion Handler
 * Sprint-038 / AGS-008 & Sprint-039 / TIF-006 (TD-015)
 */

import { NextResponse } from "next/server";
import { QuarantineManager } from "@/lib/security/quarantine-manager";
import { IpReputationEngine } from "@/lib/security/ip-reputation";
import { cryptoAuditWriter } from "@/lib/audit/crypto-writer";
import { logGatewayThreatEvent } from "@/lib/security/threat-audit-events";
import { EdgeWebhookValidator } from "@/lib/security/edge-webhook-validator";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature =
      request.headers.get("x-signature-sha256") ||
      request.headers.get("x-hub-signature-256") ||
      request.headers.get("x-edge-signature");
    const timestamp =
      request.headers.get("x-webhook-timestamp") ||
      request.headers.get("x-edge-timestamp");

    const validator = new EdgeWebhookValidator();
    const validation = validator.validate(rawBody, signature, timestamp);

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || "Unauthorized webhook call", code: validation.code || "UNAUTHORIZED" },
        { status: validation.statusCode || 401 }
      );
    }

    const body = JSON.parse(rawBody);
    const { eventType, ipAddress, reason, threatLevel } = body;

    if (!ipAddress || typeof ipAddress !== "string") {
      return NextResponse.json({ error: "Missing required field: ipAddress" }, { status: 400 });
    }

    if (eventType === "WAF_BLOCK_EVENT" || threatLevel === "CRITICAL") {
      QuarantineManager.getInstance().quarantineIp(
        ipAddress,
        `Edge WAF trigger: ${reason || "Suspicious traffic detected at edge"}`,
        60 * 60 * 1000 // 1 hour ban
      );

      await logGatewayThreatEvent({
        eventType: "gateway.ip.quarantined",
        ipAddress,
        reason: `Edge WAF webhook block: ${reason || "High threat block"}`,
        threatScore: 100,
        metadata: { eventType, threatLevel },
      });
    } else {
      IpReputationEngine.getInstance().recordSignal(
        ipAddress,
        "not_found_scan",
        { webhookSource: "edge_firewall", reason }
      );
    }

    // Emit GATEWAY_WAF_WEBHOOK_RECEIVED audit event (TIF-006)
    await cryptoAuditWriter.log({
      tenantId: "default",
      userId: "system:edge-webhook",
      action: "GATEWAY_WAF_WEBHOOK_RECEIVED" as any,
      entityType: "GATEWAY_SECURITY",
      entityId: ipAddress,
      ipAddress,
      payload: { eventType, threatLevel, reason },
      timestamp: new Date().toISOString(),
    });

    // Bridge directly to Autonomous SOAR engine (ASOR-007)
    try {
      const { ThreatIntelBridge } = await import("@/lib/security/soar/threat-intel-bridge");
      ThreatIntelBridge.getInstance().handleThreatEvent(
        {
          event_type: eventType || "WAF_BLOCK_EVENT",
          severity: threatLevel === "CRITICAL" ? "CRITICAL" : "HIGH",
          source: "edge_webhook",
          confidence: threatLevel === "CRITICAL" ? 95 : 85,
          timestamp: new Date().toISOString(),
          payload: { ip: ipAddress, reason, threatLevel },
        },
        {
          type: "IP",
          value: ipAddress,
        }
      ).catch(() => {});
    } catch {}

    return NextResponse.json({
      status: "acknowledged",
      ipAddress,
      eventType: eventType || "GENERIC_EDGE_EVENT",
      processedAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Invalid webhook payload", details: errorMsg },
      { status: 400 }
    );
  }
}
