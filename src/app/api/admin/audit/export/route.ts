import { NextResponse } from "next/server";
import { db } from "@/db";
import { auditLogs } from "@thaiba/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import {
  resolveScopedInstitutionId,
  TenantMismatchError,
  verifyActionStepUpToken,
  consumeStepUpTokenInTx,
  isStepUpReplayError,
} from "@thaiba/auth";
import { verifyAuditChainIntegrity } from "@/lib/audit/verifier";
import { generateMerkleProof } from "@/lib/audit/merkle";
import { computeAuditHmac } from "@/lib/audit/canonical";
import { cryptoAuditWriter } from "@/lib/audit/crypto-writer";
import { eq, and, gte, lte, asc } from "drizzle-orm";

export const POST = requireAuth(async (request: Request, session) => {
  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  // 1. Mandatory Step-Up Authentication Guard (Invariant D & C3.9)
  const stepUpToken = body.stepUpToken || request.headers.get("x-step-up-token");
  if (!stepUpToken) {
    return NextResponse.json(
      { error: "Step-up authentication required for cryptographic audit export" },
      { status: 403 }
    );
  }

  const stepUpVerification = await verifyActionStepUpToken(stepUpToken, {
    staffId: session.staffId,
    sid: session.sid,
    action: ["audit:export", "audit:verify"],
  });

  if (!stepUpVerification.success) {
    return NextResponse.json(
      { error: `Step-up authentication failed: ${stepUpVerification.error}` },
      { status: 403 }
    );
  }

  // 2. Tenant Scoping
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

  // 3. Atomically consume step-up token and log export action inside transaction
  try {
    await db.transaction(async (tx) => {
      await consumeStepUpTokenInTx(tx, {
        jti: stepUpVerification.payload.jti,
        staffId: session.staffId,
        action: stepUpVerification.payload.action,
        exp: stepUpVerification.exp,
      });

      await cryptoAuditWriter.log(
        {
          tenantId: targetTenantId,
          userId: session.staffId,
          action: "AUDIT_EXPORT",
          entityType: "audit_ledger",
          entityId: targetTenantId,
          payload: {
            exportedFromSeq: fromSeq || 1,
            exportedToSeq: toSeq || null,
          },
        },
        tx
      );
    });
  } catch (txErr: any) {
    if (isStepUpReplayError(txErr)) {
      return NextResponse.json(
        { error: "Forbidden: Step-up token has already been used (replay detected)" },
        { status: 403 }
      );
    }
    throw txErr;
  }

  // 4. Query target export records
  const conditions = [
    eq(auditLogs.tenantId, targetTenantId),
  ];
  if (fromSeq) conditions.push(gte(auditLogs.sequenceNumber, fromSeq));
  if (toSeq) conditions.push(lte(auditLogs.sequenceNumber, toSeq));

  const query = db
    .select()
    .from(auditLogs)
    .where(and(...conditions))
    .orderBy(asc(auditLogs.sequenceNumber));

  const records = await (query.all ? query.all() : query);

  // 5. Verify integrity of exported slice
  const verification = await verifyAuditChainIntegrity(targetTenantId, fromSeq, toSeq);

  // 6. Generate individual Merkle proofs if valid
  const leaves = records.map((r: any) => r.currentHash);
  const proofs = verification.valid && leaves.length > 0
    ? records.map((r: any) => generateMerkleProof(r.currentHash, leaves))
    : [];

  const bundlePayload = JSON.stringify({
    tenantId: targetTenantId,
    recordCount: records.length,
    merkleRoot: verification.merkleRoot,
    records,
    proofs,
  });

  const bundleSignature = computeAuditHmac(bundlePayload);

  return NextResponse.json({
    success: true,
    tenantId: targetTenantId,
    recordCount: records.length,
    merkleRoot: verification.merkleRoot,
    integrityVerified: verification.valid,
    bundleSignature,
    records,
    proofs,
  });
}, "system:audit:read");
