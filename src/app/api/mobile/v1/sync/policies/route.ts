import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { db } from "@/db";
import { syncTuningPolicies } from "@/db/schema";

export const GET = requireAuth(async (request: Request) => {
  try {
    const policies = await db.select().from(syncTuningPolicies).all();
    
    // Convert to a dictionary format keyed by networkType
    const policyMap: Record<string, any> = {};
    for (const p of policies) {
      policyMap[p.networkType] = {
        id: p.id,
        minBandwidthKbps: p.minBandwidthKbps,
        maxLatencyMs: p.maxLatencyMs,
        batchSize: p.batchSize,
        compressionLevel: p.compressionLevel,
        retryBackoffMs: p.retryBackoffMs,
        updatedAt: p.updatedAt,
      };
    }
    
    return NextResponse.json(policyMap);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
