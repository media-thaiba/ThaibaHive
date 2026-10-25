import { NextResponse } from "next/server";
import {
  requireAuth,
  resolveScopedInstitutionId,
  TenantMismatchError,
  verifyActionStepUpToken,
  consumeStepUpTokenInTx,
  isStepUpReplayError,
} from "@/lib/api/auth-guard";
import { db } from "@/db";
import { resolveHostelClient, scanGatePass } from "@/lib/hostel";
import { cryptoAuditWriter } from "@/lib/audit/crypto-writer";
import { z } from "zod";

const scanPassSchema = z.object({
  institutionId: z.string().optional(),
  passId: z.string().nullable().optional(),
  rawQrSecret: z.string().optional(),
  direction: z.enum(["out", "in"]),
  scannedAt: z.string().datetime().optional(),
  receivedAt: z.string().datetime().optional(),
  deviceId: z.string().optional().default("GATE_DEFAULT"),
  idempotencyKey: z.string().optional(),
  manualOverride: z.boolean().optional().default(false),
  overrideReason: z.string().optional(),
  stepUpToken: z.string().optional(),
});

export const POST = requireAuth(async (request: Request, session) => {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = scanPassSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Validation failed" },
      { status: 400 }
    );
  }

  let institutionId: string;
  try {
    institutionId = await resolveScopedInstitutionId(parsed.data.institutionId, session);
  } catch (err) {
    if (err instanceof TenantMismatchError || (err as any)?.name === "TenantMismatchError") {
      return NextResponse.json({ error: (err as Error).message }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to resolve tenant scope" }, { status: 403 });
  }

  const { manualOverride, overrideReason, stepUpToken, passId, rawQrSecret, direction, deviceId } = parsed.data;

  // Manual Override requires mandatory Step-Up Authentication + override reason
  if (manualOverride) {
    if (!overrideReason || overrideReason.trim().length < 5) {
      return NextResponse.json(
        { error: "Manual override requires an explanatory reason (minimum 5 characters)" },
        { status: 400 }
      );
    }

    const tokenToVerify = stepUpToken || request.headers.get("x-step-up-token");
    if (!tokenToVerify) {
      return NextResponse.json(
        { error: "Step-up authentication required for manual gate pass override", stepUpRequired: true },
        { status: 403 }
      );
    }

    const stepUpRes = await verifyActionStepUpToken(tokenToVerify, {
      staffId: session.staffId,
      sid: session.sid,
      action: ["hostel:pass:override", "hostel:gate:override"],
    });

    if (!stepUpRes.success) {
      return NextResponse.json(
        { error: `Step-up authentication failed: ${stepUpRes.error}` },
        { status: 403 }
      );
    }

    // Consume step-up token atomically before mutating state
    try {
      await consumeStepUpTokenInTx(db, { ...stepUpRes.payload, exp: stepUpRes.exp });
    } catch (replayErr) {
      if (isStepUpReplayError(replayErr)) {
        return NextResponse.json(
          { error: "Step-up token has already been consumed or replayed" },
          { status: 403 }
        );
      }
      return NextResponse.json({ error: "Failed to consume step-up authorization" }, { status: 500 });
    }
  }

  const client = resolveHostelClient(db);
  const now = new Date().toISOString();
  const scannedAt = parsed.data.scannedAt || now;
  const receivedAt = parsed.data.receivedAt || now;
  const idempotencyKey = parsed.data.idempotencyKey || `idem_scan_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  const res = await scanGatePass(client, {
    institutionId,
    passId: passId || null,
    rawQrSecret: rawQrSecret || "",
    direction,
    scannedAt,
    receivedAt,
    deviceId,
    guardStaffId: session.staffId, // Pin directly from verified session
    idempotencyKey,
    manualOverride,
    overrideReason,
  });

  if (manualOverride && res.success) {
    try {
      await cryptoAuditWriter.log({
        tenantId: institutionId,
        userId: session.staffId,
        action: "HOSTEL_GATE_MANUAL_OVERRIDE",
        entityType: "hostel_gate_log",
        entityId: res.logId,
        payload: {
          passId,
          direction,
          deviceId,
          overrideReason,
        },
      });
    } catch (auditErr) {
      console.warn("[HostelAudit] Failed to record audit log:", auditErr);
    }
  }

  if (!res.success) {
    return NextResponse.json(
      {
        success: false,
        verificationResult: res.verificationResult,
        result: res.verificationResult,
        logId: res.logId,
        error: res.error || `Gate scan rejected: ${res.verificationResult}`,
      },
      { status: 422 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      verificationResult: res.verificationResult,
      result: res.verificationResult,
      status: direction === "out" ? "used_out" : "used_in",
      logId: res.logId,
      direction,
    },
    { status: 200 }
  );
}, "hostel:pass:scan");
