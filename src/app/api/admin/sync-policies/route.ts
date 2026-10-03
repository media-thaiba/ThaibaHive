import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { db } from "@/db";
import { syncTuningPolicies } from "@/db/schema";
import { eq } from "drizzle-orm";
import { syncPolicyUpdateSchema } from "@/lib/validation/schemas";

export const GET = requireAuth(async (_request, _session) => {
  try {
    let policies = await db.select().from(syncTuningPolicies).all();
    if (policies.length === 0) {
      const now = new Date().toISOString();
      const defaults = [
        { id: "policy-wifi", networkType: "WIFI", minBandwidthKbps: 1000, maxLatencyMs: 300, batchSize: 50, compressionLevel: 6, retryBackoffMs: 2000, updatedAt: now },
        { id: "policy-cellular", networkType: "CELLULAR", minBandwidthKbps: 200, maxLatencyMs: 800, batchSize: 20, compressionLevel: 9, retryBackoffMs: 5000, updatedAt: now },
        { id: "policy-default", networkType: "DEFAULT", minBandwidthKbps: 0, maxLatencyMs: 0, batchSize: 30, compressionLevel: 4, retryBackoffMs: 3000, updatedAt: now },
      ];
      for (const p of defaults) {
        await db.insert(syncTuningPolicies).values(p).onConflictDoNothing().run();
      }
      policies = await db.select().from(syncTuningPolicies).all();
    }
    return NextResponse.json({ success: true, policies });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}, "sync:manage");

export const POST = requireAuth(async (request, session) => {
  try {
    const body = await request.json();
    const { id, ...updateFields } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing policy id parameter" }, { status: 400 });
    }

    // Validate the fields to update
    const parsed = syncPolicyUpdateSchema.safeParse(updateFields);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    // Check if policy exists
    const existing = await db
      .select()
      .from(syncTuningPolicies)
      .where(eq(syncTuningPolicies.id, id))
      .get();

    if (!existing) {
      return NextResponse.json({ error: `Policy ${id} not found` }, { status: 404 });
    }

    const now = new Date().toISOString();
    await db
      .update(syncTuningPolicies)
      .set({
        ...parsed.data,
        updatedAt: now,
      })
      .where(eq(syncTuningPolicies.id, id))
      .run();

    // Log audit trail
    const callerIp = request.headers.get("x-forwarded-for") || "unknown";
    console.log(
      JSON.stringify({
        event: "sync_policy_updated",
        callerId: session.staffId,
        policyId: id,
        updatedFields: parsed.data,
        ip: callerIp,
        timestamp: now,
      })
    );

    return NextResponse.json({
      success: true,
      message: `Policy ${id} updated successfully.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}, "sync:manage");

export const PATCH = POST; // Alias PATCH to POST for flexibility
