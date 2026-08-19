import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { z } from "zod";
import { revokeSession } from "@/lib/identity/revocation-store";
import { publishRevocation } from "@/lib/identity/revocation-mesh";

import { withDPoP } from "@/lib/identity/dpop-middleware";

const revokeSchema = z.object({
  userId:    z.string().min(1),
  sessionId: z.string().min(1),
  reason:    z.string().min(1),
});

export const POST = withDPoP(requireAuth(async (req, session) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = revokeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { userId, sessionId, reason } = parsed.data;
  const institutionId = session.staffId; // use staffId as tenantId proxy for audit

  // Write to central revocation store and audit chain
  await revokeSession(sessionId, userId, reason, institutionId);

  // Propagate to mesh (fire-and-forget — failures are non-fatal)
  let propagated = false;
  try {
    publishRevocation(sessionId, userId, reason);
    propagated = true;
  } catch {
    // Non-fatal: central store already holds the record
  }

  return NextResponse.json({ revoked: true, propagated });
}, "system:security:revoke"), { required: true });
