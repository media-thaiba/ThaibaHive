import { NextResponse } from "next/server";
import { requireAuth, resolveScopedInstitutionId, TenantMismatchError } from "@/lib/api/auth-guard";
import { db } from "@/db";
import {
  resolveHostelClient,
  assessFine,
  calculateLateReturnFine,
  HostelSettings,
} from "@/lib/hostel";
import { cryptoAuditWriter } from "@/lib/audit/crypto-writer";
import { z } from "zod";

const assessFineSchema = z.object({
  institutionId: z.string().optional(),
  studentId: z.string().min(1, "studentId is required"),
  leaveId: z.string().optional(),
  fineCategory: z.enum(["late_return", "disciplinary", "property_damage", "misconduct"]),
  daysLate: z.number().int().min(0).optional(),
  ratePerDayMinor: z.number().int().min(0).optional(),
  totalAmountMinor: z.number().int().min(1).optional(),
  expectedInAt: z.string().datetime().optional(),
  actualInAt: z.string().datetime().optional(),
  idempotencyKey: z.string().optional(),
});

export const POST = requireAuth(async (request: Request, session) => {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = assessFineSchema.safeParse(body);
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
  let daysLate = parsed.data.daysLate ?? 0;
  let ratePerDayMinor = parsed.data.ratePerDayMinor ?? 0;
  let totalAmountMinor = parsed.data.totalAmountMinor;

  // Auto-calculation logic if fineCategory is late_return and expected/actual times are supplied
  if (parsed.data.fineCategory === "late_return" && parsed.data.expectedInAt && parsed.data.actualInAt && !totalAmountMinor) {
    try {
      let settings: HostelSettings | null = null;
      if (typeof client.query === "function" && typeof client.execute !== "function") {
        const sRes = await client.query(
          `SELECT grace_period_minutes, late_fine_rate_per_day_minor, rounding_rule FROM hostel_settings WHERE institution_id = $1;`,
          [institutionId]
        );
        if (sRes.rows.length > 0) {
          const row = sRes.rows[0];
          settings = {
            institutionId,
            gracePeriodMinutes: Number(row.grace_period_minutes),
            lateFineRatePerDayMinor: Number(row.late_fine_rate_per_day_minor ?? row.late_fine_rate_per_day),
            roundingRule: row.rounding_rule as any,
          };
        }
      } else if (typeof client.execute === "function") {
        const sRes = await client.execute({
          sql: `SELECT grace_period_minutes, late_fine_rate_per_day_minor, rounding_rule FROM hostel_settings WHERE institution_id = ?;`,
          args: [institutionId],
        });
        if (sRes.rows.length > 0) {
          const row = sRes.rows[0] as any;
          settings = {
            institutionId,
            gracePeriodMinutes: Number(row.grace_period_minutes),
            lateFineRatePerDayMinor: Number(row.late_fine_rate_per_day_minor ?? row.late_fine_rate_per_day),
            roundingRule: row.rounding_rule as any,
          };
        }
      }

      if (settings) {
        const calc = calculateLateReturnFine(parsed.data.expectedInAt, parsed.data.actualInAt, settings);
        daysLate = calc.daysLate;
        ratePerDayMinor = calc.ratePerDayMinor;
        totalAmountMinor = calc.totalAmountMinor;

        if (totalAmountMinor <= 0) {
          return NextResponse.json(
            { success: true, message: "No fine assessed: student return within institutional grace period", totalAmountMinor: 0 },
            { status: 200 }
          );
        }
      }
    } catch (calcErr) {
      console.warn("[HostelFine] Auto fine calculation error:", calcErr);
    }
  }

  if (!totalAmountMinor || totalAmountMinor <= 0) {
    return NextResponse.json(
      { error: "totalAmountMinor is required and must be greater than 0" },
      { status: 400 }
    );
  }

  const idempotencyKey = parsed.data.idempotencyKey || `idem_fine_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const createdAt = new Date().toISOString();
  const actorType = session.role === "system" ? "system" : "staff";
  const actorStaffId = session.role === "system" ? undefined : session.staffId;

  const res = await assessFine(client, {
    institutionId,
    studentId: parsed.data.studentId,
    leaveId: parsed.data.leaveId,
    fineCategory: parsed.data.fineCategory,
    daysLate,
    ratePerDayMinor,
    totalAmountMinor,
    actorType,
    actorStaffId,
    idempotencyKey,
    createdAt,
  });

  if (!res.success) {
    const errorMsg = res.error || "Failed to assess fine";
    if (errorMsg.includes("idx_single_late_fine_per_leave") || errorMsg.includes("already assessed")) {
      return NextResponse.json({ error: "Late return fine has already been assessed for this leave request" }, { status: 409 });
    }
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }

  try {
    await cryptoAuditWriter.log({
      tenantId: institutionId,
      userId: session.staffId,
      action: "HOSTEL_FINE_ASSESS",
      entityType: "hostel_fine",
      entityId: res.fineId,
      payload: {
        studentId: parsed.data.studentId,
        leaveId: parsed.data.leaveId,
        fineCategory: parsed.data.fineCategory,
        totalAmountMinor,
      },
    });
  } catch (auditErr) {
    console.warn("[HostelAudit] Failed to record audit log:", auditErr);
  }

  return NextResponse.json(
    {
      success: true,
      fineId: res.fineId,
      actionId: res.actionId,
      totalAmountMinor,
      daysLate,
    },
    { status: 201 }
  );
}, "hostel:fine:assess");
