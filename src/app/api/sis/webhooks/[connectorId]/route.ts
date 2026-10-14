import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { ConnectorRegistry } from "@/lib/sis/connector-registry";
import { CredentialVault } from "@/lib/sis/credential-vault";
import { RecordMapper } from "@/lib/sis/record-mapper";
import { isSisSyncEnabled } from "@/lib/features";
import {
  sisWebhookPayloadSchema,
  type SisWebhookRecord,
} from "@/lib/validation/schemas";
import type { NormalizedRecord, SisEntityType } from "@/lib/sis/adapters/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 1024 * 1024; // 1MB body limit
const TIMESTAMP_TOLERANCE_SECONDS = 300; // ±300s
const NONCE_TTL_SECONDS = 600; // 600s TTL (2x window)

// Bounded in-memory nonce replay store: key = `${connectorId}:${nonce}`, value = expiry timestamp ms
const nonceCache = new Map<string, number>();

export function clearWebhookNonceCache(): void {
  nonceCache.clear();
}

function cleanExpiredNonces(): void {
  const now = Date.now();
  for (const [key, expiresAt] of nonceCache.entries()) {
    if (expiresAt <= now) {
      nonceCache.delete(key);
    }
  }
}

/**
 * POST /api/sis/webhooks/[connectorId]
 * Authenticated public webhook callback for external SIS changes.
 * Enforces bounded raw body, constant-time HMAC over timestamp.body,
 * ±300s window, and 600s nonce replay defense (Gates 12 & 18).
 */
export async function POST(
  request: Request,
  context?: { params?: Promise<{ connectorId?: string }> }
) {
  const params = await context?.params;
  const connectorId = params?.connectorId;

  if (!connectorId) {
    return NextResponse.json({ error: "Connector ID required" }, { status: 400 });
  }

  // 1. Fetch connector record
  const connector = await ConnectorRegistry.getConnectorById(connectorId);
  if (!connector) {
    return NextResponse.json({ error: "Connector not found" }, { status: 404 });
  }

  if (!connector.enabled) {
    return NextResponse.json({ error: "Connector is disabled" }, { status: 400 });
  }

  // 2. Feature flag check
  if (!isSisSyncEnabled(connector.institutionId)) {
    return NextResponse.json({ error: "SIS sync feature is disabled" }, { status: 403 });
  }

  // 3. Extract authentication headers
  const signature =
    request.headers.get("x-thaiba-signature") ||
    request.headers.get("x-webhook-signature") ||
    request.headers.get("x-hub-signature-256");

  const timestampStr =
    request.headers.get("x-thaiba-timestamp") ||
    request.headers.get("x-webhook-timestamp");

  const nonce =
    request.headers.get("x-thaiba-nonce") ||
    request.headers.get("x-webhook-nonce");

  if (!signature || !timestampStr || !nonce) {
    return NextResponse.json(
      { error: "Missing required webhook authentication headers" },
      { status: 401 }
    );
  }

  // 4. Timestamp drift check (±300s)
  const timestamp = Number(timestampStr);
  if (isNaN(timestamp)) {
    return NextResponse.json({ error: "Invalid timestamp header" }, { status: 401 });
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - timestamp) > TIMESTAMP_TOLERANCE_SECONDS) {
    return NextResponse.json(
      { error: "Webhook timestamp outside tolerance window" },
      { status: 401 }
    );
  }

  // 5. Nonce replay defense (TTL 600s)
  cleanExpiredNonces();
  const nonceKey = `${connectorId}:${nonce}`;
  if (nonceCache.has(nonceKey)) {
    return NextResponse.json(
      { error: "Webhook replay detected: nonce already used" },
      { status: 401 }
    );
  }

  // 6. Read bounded raw body first
  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  // 7. Resolve connector webhook secret
  const secret = await CredentialVault.resolveSecret(connector.credentialRef);
  if (!secret) {
    return NextResponse.json(
      { error: "Connector webhook secret is not configured" },
      { status: 500 }
    );
  }

  // 8. Constant-time HMAC comparison over `${timestamp}.${rawBody}`
  const signedPayload = `${timestampStr}.${rawBody}`;
  const hmac = createHmac("sha256", secret).update(signedPayload).digest("hex");

  // Accept with or without sha256= prefix
  const cleanSignature = signature.startsWith("sha256=")
    ? signature.substring(7)
    : signature;

  const expectedBuffer = Buffer.from(hmac, "utf8");
  const actualBuffer = Buffer.from(cleanSignature, "utf8");

  if (
    expectedBuffer.length !== actualBuffer.length ||
    !timingSafeEqual(expectedBuffer, actualBuffer)
  ) {
    return NextResponse.json(
      { error: "Invalid webhook HMAC signature" },
      { status: 401 }
    );
  }

  // 9. Mark nonce as used
  nonceCache.set(nonceKey, Date.now() + NONCE_TTL_SECONDS * 1000);

  // 10. Only now that signature is verified, parse JSON
  let bodyJson: any;
  try {
    bodyJson = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = sisWebhookPayloadSchema.safeParse(bodyJson);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // 11. Normalize events and process via RecordMapper
  const events: SisWebhookRecord[] = "events" in parsed.data ? parsed.data.events : [parsed.data];
  let processedCount = 0;

  for (const ev of events) {
    const entityType: SisEntityType = (
      ["students", "staff", "courses", "sections", "enrollments"].includes(ev.entityType)
        ? ev.entityType
        : ev.entityType.endsWith("s")
        ? ev.entityType
        : `${ev.entityType}s`
    ) as SisEntityType;

    const normalized: NormalizedRecord = {
      entityType,
      externalId: ev.externalId,
      sourceStandard: connector.standard,
      payload: {
        externalId: ev.externalId,
        event: ev.event,
        ...ev.data,
      },
    };

    try {
      await RecordMapper.processRecord(connector.institutionId, connector.id, normalized);
      processedCount++;
    } catch (err) {
      console.error("Failed to process webhook record:", err);
    }
  }

  return NextResponse.json({
    success: true,
    processed: processedCount,
  });
}
