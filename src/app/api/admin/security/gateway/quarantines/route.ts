/**
 * Gateway Quarantines Management API Route
 * Sprint-038 / AGS-012
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { withDPoP } from "@/lib/identity/dpop-middleware";
import { QuarantineManager } from "@/lib/security/quarantine-manager";
import { QuarantineMesh } from "@/lib/security/quarantine-mesh";
import { CreateQuarantineSchema } from "@/lib/validation/gateway-schemas";

export const GET = withDPoP(
  requireAuth(async () => {
    const quarantines = QuarantineManager.getInstance().getStore().getAllActiveQuarantines();
    return NextResponse.json({
      quarantines,
      total: quarantines.length,
    });
  }, "system:security:view"),
  { required: false }
);

export const POST = withDPoP(
  requireAuth(async (request: Request, session) => {
    try {
      const body = await request.json();
      const parsed = CreateQuarantineSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid payload" }, { status: 400 });
      }

      const durationMs = parsed.data.durationMinutes * 60 * 1000;
      const bannedBy = session?.email || "admin";

      const result = QuarantineManager.getInstance().quarantineIp(
        parsed.data.ipAddress,
        parsed.data.reason,
        durationMs,
        parsed.data.tenantId,
        bannedBy
      );

      // Broadcast over distributed mesh
      QuarantineMesh.getInstance().broadcastQuarantine(result.record);

      return NextResponse.json({
        success: true,
        quarantine: result.record,
        subnetContained: result.subnetContained,
      });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || "Failed to create quarantine" }, { status: 500 });
    }
  }, "system:security:manage"),
  { required: false }
);

export const DELETE = withDPoP(
  requireAuth(async (request: Request) => {
    const url = new URL(request.url);
    const idOrIp = url.searchParams.get("id") || url.searchParams.get("ip");

    if (!idOrIp) {
      return NextResponse.json({ error: "Missing required query parameter: id or ip" }, { status: 400 });
    }

    const unbanned = QuarantineManager.getInstance().unban(idOrIp);
    if (!unbanned) {
      return NextResponse.json({ error: "Quarantine record not found" }, { status: 404 });
    }

    QuarantineMesh.getInstance().broadcastUnban(idOrIp);

    return NextResponse.json({
      success: true,
      message: `Quarantine removed for ${idOrIp}`,
    });
  }, "system:security:manage"),
  { required: false }
);
