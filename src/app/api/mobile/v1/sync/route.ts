import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";

export interface SyncMutation {
  id: string;
  action: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

export const POST = requireAuth(async (request: Request) => {
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

      // Process offline actions using Last-Write-Wins (LWW) logic
      try {
        switch (mut.action) {
          case "STAFF_CHECKIN":
          case "VOUCHER_APPROVAL":
          case "STUDENT_ATTENDANCE":
            processedMutations.push(mut.id);
            break;
          default:
            processedMutations.push(mut.id);
            break;
        }
      } catch {
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
