import { NextResponse } from "next/server";
import { requireAuth, resolveScopedInstitutionId, TenantMismatchError } from "@/lib/api/auth-guard";
import { db } from "@/db";
import { resolveHostelClient, vacateHostelBed } from "@/lib/hostel";
import { cryptoAuditWriter } from "@/lib/audit/crypto-writer";

export const DELETE = requireAuth(async (request: Request, session, context?: { params?: Promise<{ id: string }> }) => {
  const { id } = (await context?.params) || {};
  if (!id) {
    return NextResponse.json({ error: "Allocation ID is required" }, { status: 400 });
  }

  const url = new URL(request.url);
  const requestedInst = url.searchParams.get("institutionId");

  let institutionId: string;
  try {
    institutionId = await resolveScopedInstitutionId(requestedInst, session);
  } catch (err) {
    if (err instanceof TenantMismatchError || (err as any)?.name === "TenantMismatchError") {
      return NextResponse.json({ error: (err as Error).message }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to resolve tenant scope" }, { status: 403 });
  }

  const client = resolveHostelClient(db);
  const vacatedAt = new Date().toISOString();

  const res = await vacateHostelBed(client, {
    institutionId,
    allocationId: id,
    vacatedAt,
  });

  if (!res.success) {
    const errorMsg = res.error || "Failed to vacate bed";
    if (errorMsg.includes("not found") || errorMsg.includes("already vacated")) {
      return NextResponse.json({ error: errorMsg }, { status: 404 });
    }
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }

  try {
    await cryptoAuditWriter.log({
      tenantId: institutionId,
      userId: session.staffId,
      action: "HOSTEL_BED_VACATE",
      entityType: "hostel_bed_allocation",
      entityId: id,
      payload: { vacatedAt },
    });
  } catch (auditErr) {
    console.warn("[HostelAudit] Failed to record audit log:", auditErr);
  }

  return NextResponse.json({ success: true, message: "Bed vacated successfully" });
}, "hostel:bed:allocate");
