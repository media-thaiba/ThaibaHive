import { NextResponse } from "next/server";
import { requireAuth, resolveScopedInstitutionId, TenantMismatchError } from "@/lib/api/auth-guard";
import { db } from "@/db";
import { resolveHostelClient, reissueGatePass } from "@/lib/hostel";
import { cryptoAuditWriter } from "@/lib/audit/crypto-writer";
import { z } from "zod";
import crypto from "crypto";

const reissuePassSchema = z.object({
  institutionId: z.string().optional(),
  leaveId: z.string().optional(),
  studentId: z.string().optional(),
  newPassNumber: z.string().optional(),
  rawQrSecret: z.string().optional(),
  validFrom: z.string().datetime({ message: "validFrom must be a valid ISO timestamp" }).optional(),
  validUntil: z.string().datetime({ message: "validUntil must be a valid ISO timestamp" }),
  reason: z.string().optional(),
  issuedAt: z.string().datetime().optional(),
});

export const POST = requireAuth(async (request: Request, session, context?: { params?: Promise<{ id: string }> }) => {
  const { id: oldPassId } = (await context?.params) || {};
  if (!oldPassId) {
    return NextResponse.json({ error: "Old pass ID is required" }, { status: 400 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = reissuePassSchema.safeParse(body);
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

  const client = resolveHostelClient(db);
  const newPassNumber = parsed.data.newPassNumber || `GP-${Date.now()}-R-${Math.random().toString(36).substring(7).toUpperCase()}`;
  const rawQrSecret = parsed.data.rawQrSecret || crypto.randomBytes(32).toString("hex");
  const issuedAt = parsed.data.issuedAt || new Date().toISOString();

  let leaveId = parsed.data.leaveId;
  let studentId = parsed.data.studentId;
  let validFrom = parsed.data.validFrom;

  if (!leaveId || !studentId || !validFrom) {
    if (typeof client.execute === "function") {
      const pRes = await client.execute({
        sql: `SELECT leave_id, student_id, valid_from FROM hostel_gate_passes WHERE id = ? AND institution_id = ?;`,
        args: [oldPassId, institutionId],
      });
      if (pRes.rows.length === 0) {
        return NextResponse.json({ error: "Original gate pass not found" }, { status: 404 });
      }
      const row = pRes.rows[0] as any;
      leaveId = leaveId || row.leave_id;
      studentId = studentId || row.student_id;
      validFrom = validFrom || row.valid_from;
    } else {
      const pRes = await client.query(
        `SELECT leave_id, student_id, valid_from FROM hostel_gate_passes WHERE id = $1 AND institution_id = $2;`,
        [oldPassId, institutionId]
      );
      if (pRes.rows.length === 0) {
        return NextResponse.json({ error: "Original gate pass not found" }, { status: 404 });
      }
      const row = pRes.rows[0];
      leaveId = leaveId || row.leave_id;
      studentId = studentId || row.student_id;
      validFrom = validFrom || row.valid_from;
    }
  }

  if (!leaveId || !studentId || !validFrom) {
    return NextResponse.json({ error: "Could not resolve pass metadata" }, { status: 400 });
  }

  const res = await reissueGatePass(client, {
    institutionId,
    leaveId,
    studentId,
    oldPassId,
    staffId: session.staffId,
    newPassNumber,
    rawQrSecret,
    validFrom,
    validUntil: parsed.data.validUntil,
    issuedAt,
  });

  if (!res.success) {
    const errorMsg = res.error || "Failed to reissue gate pass";
    if (errorMsg.includes("CAS concurrency conflict")) {
      return NextResponse.json({ error: errorMsg }, { status: 409 });
    }
    if (errorMsg.includes("used_in") || errorMsg.includes("already revoked")) {
      return NextResponse.json({ error: errorMsg }, { status: 409 });
    }
    if (errorMsg.includes("not found")) {
      return NextResponse.json({ error: errorMsg }, { status: 404 });
    }
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }

  try {
    await cryptoAuditWriter.log({
      tenantId: institutionId,
      userId: session.staffId,
      action: "HOSTEL_PASS_REISSUE",
      entityType: "hostel_gate_pass",
      entityId: res.passId,
      payload: {
        oldPassId,
        newPassNumber,
        validFrom: parsed.data.validFrom,
        validUntil: parsed.data.validUntil,
      },
    });
  } catch (auditErr) {
    console.warn("[HostelAudit] Failed to record audit log:", auditErr);
  }

  return NextResponse.json(
    {
      success: true,
      passId: res.passId,
      newPassNumber,
      rawQrSecret, // Single reveal of newly generated secret
      validFrom: parsed.data.validFrom,
      validUntil: parsed.data.validUntil,
    },
    { status: 200 }
  );
}, "hostel:pass:issue");
