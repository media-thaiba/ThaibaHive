import { NextResponse } from "next/server";
import { requireAuth, resolveScopedInstitutionId, TenantMismatchError } from "@/lib/api/auth-guard";
import { db } from "@/db";
import { resolveHostelClient, allocateHostelBed } from "@/lib/hostel";
import { cryptoAuditWriter } from "@/lib/audit/crypto-writer";
import { z } from "zod";

const allocateSchema = z.object({
  institutionId: z.string().optional(),
  bedId: z.string().min(1, "bedId is required"),
  studentId: z.string().min(1, "studentId is required"),
  academicYearId: z.string().min(1, "academicYearId is required"),
  allocatedAt: z.string().datetime().optional(),
});

export const POST = requireAuth(async (request: Request, session) => {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = allocateSchema.safeParse(body);
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
  const allocatedAt = parsed.data.allocatedAt || new Date().toISOString();

  const res = await allocateHostelBed(client, {
    institutionId,
    bedId: parsed.data.bedId,
    studentId: parsed.data.studentId,
    academicYearId: parsed.data.academicYearId,
    staffId: session.staffId, // Pin directly from session
    allocatedAt,
  });

  if (!res.success) {
    const errorMsg = res.error || "Allocation failed";
    if (res.collisionType === "bed_collision" || res.collisionType === "student_collision" || errorMsg.includes("full capacity")) {
      return NextResponse.json({ error: errorMsg, collisionType: res.collisionType }, { status: 409 });
    }
    if (errorMsg.includes("assigned warden")) {
      return NextResponse.json({ error: errorMsg }, { status: 403 });
    }
    if (errorMsg.includes("Gender parity") || errorMsg.includes("under maintenance")) {
      return NextResponse.json({ error: errorMsg }, { status: 422 });
    }
    if (errorMsg.includes("not exist") || errorMsg.includes("not found")) {
      return NextResponse.json({ error: errorMsg }, { status: 404 });
    }
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }

  try {
    await cryptoAuditWriter.log({
      tenantId: institutionId,
      userId: session.staffId,
      action: "HOSTEL_BED_ALLOCATE",
      entityType: "hostel_bed_allocation",
      entityId: res.allocationId,
      payload: {
        bedId: parsed.data.bedId,
        studentId: parsed.data.studentId,
        academicYearId: parsed.data.academicYearId,
      },
    });
  } catch (auditErr) {
    console.warn("[HostelAudit] Failed to record audit log:", auditErr);
  }

  return NextResponse.json({ success: true, allocationId: res.allocationId }, { status: 201 });
}, "hostel:bed:allocate");
