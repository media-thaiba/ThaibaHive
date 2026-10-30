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
import { resolveHostelClient, waiveFine } from "@/lib/hostel";
import { cryptoAuditWriter } from "@/lib/audit/crypto-writer";
import { z } from "zod";

const waiveFineSchema = z.object({
  institutionId: z.string().optional(),
  waiveAmountMinor: z.number().int().min(1, "waiveAmountMinor must be greater than 0").optional(),
  reason: z.string().min(5, "reason is required and must be at least 5 characters"),
  stepUpToken: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

export const POST = requireAuth(async (request: Request, session, context?: { params?: Promise<{ id: string }> }) => {
  const { id: fineId } = (await context?.params) || {};
  if (!fineId) {
    return NextResponse.json({ error: "Fine ID is required" }, { status: 400 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = waiveFineSchema.safeParse(body);
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

  // 1. Mandatory Step-Up Authentication verification
  const tokenToVerify = parsed.data.stepUpToken || request.headers.get("x-step-up-token");
  if (!tokenToVerify) {
    return NextResponse.json(
      { error: "Step-up authentication required for fine waiver", stepUpRequired: true },
      { status: 403 }
    );
  }

  const stepUpRes = await verifyActionStepUpToken(tokenToVerify, {
    staffId: session.staffId,
    sid: session.sid,
    action: ["hostel:fine:waive", "finance:waive"],
  });

  if (!stepUpRes.success) {
    return NextResponse.json(
      { error: `Step-up authentication failed: ${stepUpRes.error}`, stepUpRequired: true },
      { status: 403 }
    );
  }

  // 2. Consume step-up token atomically BEFORE mutating state
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

  // 3. Resolve waiver amount if not explicitly passed
  const client = resolveHostelClient(db);
  let waiveAmountMinor = parsed.data.waiveAmountMinor;
  if (!waiveAmountMinor) {
    if (typeof client.execute === "function") {
      const fRes = await client.execute({
        sql: `SELECT (total_amount - paid_amount) as amount_minor FROM hostel_fines WHERE id = ? AND institution_id = ?;`,
        args: [fineId, institutionId],
      });
      if (fRes.rows.length === 0) {
        return NextResponse.json({ error: "Fine record not found" }, { status: 404 });
      }
      waiveAmountMinor = Number((fRes.rows[0] as any).amount_minor);
    } else {
      const fRes = await client.query(
        `SELECT (total_amount - paid_amount) as amount_minor FROM hostel_fines WHERE id = $1 AND institution_id = $2;`,
        [fineId, institutionId]
      );
      if (fRes.rows.length === 0) {
        return NextResponse.json({ error: "Fine record not found" }, { status: 404 });
      }
      waiveAmountMinor = Number(fRes.rows[0].amount_minor);
    }
  }

  // 4. Execute fine waiver
  const idempotencyKey = parsed.data.idempotencyKey || `idem_waive_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const createdAt = new Date().toISOString();

  const res = await waiveFine(client, {
    institutionId,
    fineId,
    waiveAmountMinor,
    actorStaffId: session.staffId, // Pin directly from verified session
    reason: parsed.data.reason,
    idempotencyKey,
    createdAt,
  });

  if (!res.success) {
    const errorMsg = res.error || "Failed to waive fine";
    if (errorMsg.includes("already paid, waived") || errorMsg.includes("status 'waived'") || errorMsg.includes("status 'paid'")) {
      return NextResponse.json({ error: errorMsg }, { status: 409 });
    }
    if (errorMsg.includes("not found") || errorMsg.includes("Fine not found")) {
      return NextResponse.json({ error: errorMsg }, { status: 404 });
    }
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }

  try {
    await cryptoAuditWriter.log({
      tenantId: institutionId,
      userId: session.staffId,
      action: "HOSTEL_FINE_WAIVE",
      entityType: "hostel_fine",
      entityId: fineId,
      payload: {
        waiveAmountMinor: parsed.data.waiveAmountMinor,
        reason: parsed.data.reason,
        actionId: res.actionId,
      },
    });
  } catch (auditErr) {
    console.warn("[HostelAudit] Failed to record audit log:", auditErr);
  }

  return NextResponse.json(
    {
      success: true,
      fineId,
      actionId: res.actionId,
      status: "waived",
    },
    { status: 200 }
  );
}, "hostel:fine:waive");
