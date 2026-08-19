import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { CrossRegionReplicationEngine } from "@/lib/mesh/replication-engine";
import crypto from "crypto";

export const POST = requireAuth(async (request: Request, session) => {
  try {
    const body = await request.json().catch(() => ({}));
    const { targetRegion = "eu-west", entityType = "student", tenantId } = body;
    const effectiveTenant = tenantId || (session as any).institutionId || "inst-001";

    const engine = new CrossRegionReplicationEngine("us-east");
    const delta = engine.createMutationDelta(
      entityType,
      `sync_${crypto.randomUUID()}`,
      effectiveTenant,
      "UPDATE",
      { syncTriggeredBy: (session as any).userId || "admin", triggeredAt: new Date().toISOString() }
    );

    const payload = engine.serializePayload(targetRegion, [delta]);

    return NextResponse.json({
      success: true,
      message: `Cross-region replication manually triggered to region ${targetRegion}`,
      payloadId: payload.id,
      mutationsCount: payload.mutations.length,
      batchChecksum: payload.batchChecksum,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}, "mesh:admin");
