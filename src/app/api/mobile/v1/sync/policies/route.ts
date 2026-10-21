import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { db } from "@/db";
import { syncTuningPolicies } from "@/db/schema";

export const GET = requireAuth(async (_request: Request, session) => {
  const rl = checkRateLimit(session.staffId, "read");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  try {
    const query = db.select().from(syncTuningPolicies);
    const policies = typeof (query as any).all === "function" ? await (query as any).all() : await query;
    
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
}, "mobile:sync");
