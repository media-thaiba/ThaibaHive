import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { resolveScopedInstitutionId, TenantMismatchError } from "@thaiba/auth";
import { verifyAuditChainIntegrity } from "@/lib/audit/verifier";

export const POST = requireAuth(async (request: Request, session) => {
  let body: any = {};
  try {
    body = await request.json();
  } catch {
    // Body is optional if querying own institution
  }

  const requestedTenantId = body.tenantId;

  let targetTenantId: string;
  try {
    targetTenantId = await resolveScopedInstitutionId(requestedTenantId, session, { allowGlobal: true });
  } catch (err: any) {
    if (err instanceof TenantMismatchError || err.name === "TenantMismatchError") {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Unauthorized tenant scope" }, { status: 403 });
  }

  const fromSeq = typeof body.fromSeq === "number" ? body.fromSeq : undefined;
  const toSeq = typeof body.toSeq === "number" ? body.toSeq : undefined;

  const result = await verifyAuditChainIntegrity(targetTenantId, fromSeq, toSeq);

  return NextResponse.json({
    tenantId: targetTenantId,
    ...result,
  });
}, "system:audit:verify");
