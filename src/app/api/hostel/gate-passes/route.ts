import { NextResponse } from "next/server";
import { requireAuth, resolveScopedInstitutionId, TenantMismatchError } from "@/lib/api/auth-guard";
import { db } from "@/db";
import { resolveHostelClient, issueGatePass } from "@/lib/hostel";
import { cryptoAuditWriter } from "@/lib/audit/crypto-writer";
import { z } from "zod";
import crypto from "crypto";

const issuePassSchema = z.object({
  institutionId: z.string().optional(),
  leaveId: z.string().min(1, "leaveId is required"),
  studentId: z.string().optional(),
  passNumber: z.string().optional(),
  rawQrSecret: z.string().optional(),
  validFrom: z.string().datetime({ message: "validFrom must be a valid ISO timestamp" }).optional(),
  validUntil: z.string().datetime({ message: "validUntil must be a valid ISO timestamp" }),
  issuedAt: z.string().datetime().optional(),
});

export const POST = requireAuth(async (request: Request, session) => {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = issuePassSchema.safeParse(body);
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
  const passNumber = parsed.data.passNumber || `GP-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;
  const rawQrSecret = parsed.data.rawQrSecret || crypto.randomBytes(32).toString("hex");
  const issuedAt = parsed.data.issuedAt || new Date().toISOString();

  let studentId = parsed.data.studentId;
  if (!studentId) {
    if (typeof client.execute === "function") {
      const lRes = await client.execute({
        sql: `SELECT student_id FROM hostel_leaves WHERE id = ? AND institution_id = ?;`,
        args: [parsed.data.leaveId, institutionId],
      });
      if (lRes.rows.length === 0) {
        return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
      }
      studentId = (lRes.rows[0] as any).student_id;
    } else {
      const lRes = await client.query(
        `SELECT student_id FROM hostel_leaves WHERE id = $1 AND institution_id = $2;`,
        [parsed.data.leaveId, institutionId]
      );
      if (lRes.rows.length === 0) {
        return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
      }
      studentId = lRes.rows[0].student_id;
    }
  }

  if (!studentId) {
    return NextResponse.json({ error: "Student ID could not be resolved" }, { status: 400 });
  }

  const validFrom = parsed.data.validFrom || issuedAt;

  const res = await issueGatePass(client, {
    institutionId,
    leaveId: parsed.data.leaveId,
    studentId,
    passNumber,
    rawQrSecret,
    validFrom,
    validUntil: parsed.data.validUntil,
    staffId: session.staffId,
    issuedAt,
  });

  if (!res.success) {
    const errorMsg = res.error || "Failed to issue gate pass";
    if (errorMsg.includes("idx_one_live_pass_per_leave") || errorMsg.includes("already exists") || errorMsg.includes("UNIQUE")) {
      return NextResponse.json({ error: "An active gate pass already exists for this leave request", detail: errorMsg }, { status: 409 });
    }
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }

  try {
    await cryptoAuditWriter.log({
      tenantId: institutionId,
      userId: session.staffId,
      action: "HOSTEL_PASS_ISSUE",
      entityType: "hostel_gate_pass",
      entityId: res.passId,
      payload: {
        leaveId: parsed.data.leaveId,
        studentId: parsed.data.studentId,
        passNumber,
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
      passNumber,
      rawQrSecret, // Single reveal for client/QR generator
      validFrom: parsed.data.validFrom,
      validUntil: parsed.data.validUntil,
    },
    { status: 201 }
  );
}, "hostel:pass:issue");
