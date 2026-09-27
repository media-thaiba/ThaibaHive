import { NextResponse } from "next/server";
import { db } from "@/db";
import { mobileSyncProcessed } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { applySyncMutation } from "@/lib/mobile/sync-appliers";
import { eq } from "drizzle-orm";

export interface SyncMutation {
  id: string;
  action: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

export const POST = requireAuth(async (request: Request, session) => {
  try {
    let body: { lastSyncedAt?: string; mutations?: SyncMutation[] } = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON request payload" }, { status: 400 });
    }

    const mutations = body.mutations || [];
    const processedMutations: string[] = [];
    const failedMutations: string[] = [];

    for (const mut of mutations) {
      if (!mut.id || !mut.action) {
        failedMutations.push(mut.id || "unknown");
        continue;
      }

      try {
        // Idempotency: already-processed client event IDs are acknowledged
        // without re-executing (safe replay after transport retries).
        const alreadyProcessed = await db
          .select({ clientEventId: mobileSyncProcessed.clientEventId })
          .from(mobileSyncProcessed)
          .where(eq(mobileSyncProcessed.clientEventId, mut.id))
          .get();

        if (!alreadyProcessed) {
          await applySyncMutation(
            { staffId: session.staffId, role: session.role },
            mut.action,
            mut.payload || {}
          );

          await db
            .insert(mobileSyncProcessed)
            .values({ clientEventId: mut.id, staffId: session.staffId, action: mut.action })
            .run();
        }

        processedMutations.push(mut.id);
      } catch (error: unknown) {
        console.error(
          `Mobile sync mutation failed (action=${mut.action} id=${mut.id}):`,
          error instanceof Error ? error.message : error
        );
        failedMutations.push(mut.id);
      }
    }

    return NextResponse.json({
      success: true,
      processedMutations,
      failedMutations,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Mobile sync error:", error);
    return NextResponse.json({ error: "Failed to process mobile sync batch" }, { status: 500 });
  }
});
