import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/db";
import { mobileSyncProcessed, offlineSyncOutbox } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { resolveScopedInstitutionId } from "@/lib/auth";
import { applySyncMutation, runWithTx } from "@/lib/mobile/sync-appliers";
import {
  clampClientTimestamp,
  extractSyncEntityId,
  fetchSyncServerRecord,
} from "@/lib/mobile/sync-records";
import { deriveSyncEntity } from "@/lib/validation/schemas";
import { SyncConflictResolver } from "@/lib/offline/sync-conflict-resolver";
import { eq } from "drizzle-orm";

export interface SyncMutation {
  id: string;
  action: string;
  timestamp: string;
  payload: Record<string, unknown>;
  /** payload v2 — optional; server re-derives and rejects mismatches */
  mutationType?: string;
  entityType?: string;
}

export interface SyncConflictSummary {
  clientEventId: string;
  entityType: string;
  status: "CONFLICT" | "NEEDS_REVIEW";
  fields: string[];
}

const resolver = new SyncConflictResolver();

export const POST = requireAuth(async (request: Request, session) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  try {
    let body: {
      deviceId?: string;
      lastSyncedAt?: string;
      mutations?: SyncMutation[];
    } = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON request payload" }, { status: 400 });
    }

    if (body.mutations && Array.isArray(body.mutations) && body.mutations.length > 500) {
      return NextResponse.json(
        { error: "Batch size exceeds limit of 500 mutations" },
        { status: 400 }
      );
    }

    const scopedInstitutionId = await resolveScopedInstitutionId(session.institutionId, session);
    const tenantId =
      scopedInstitutionId || session.institutionId || "global";
    const deviceId = typeof body.deviceId === "string" && body.deviceId ? body.deviceId : "unknown";
    const actor = {
      staffId: session.staffId,
      role: session.role,
      institutionId: session.institutionId,
    };

    const mutations = body.mutations || [];
    const processedMutations: string[] = [];
    const failedMutations: string[] = [];
    const conflicts: SyncConflictSummary[] = [];

    for (const mut of mutations) {
      if (!mut || typeof mut !== "object" || !mut.id || !mut.action) {
        failedMutations.push(mut?.id || "unknown");
        continue;
      }

      // Server-authoritative action → entity derivation (payload v2)
      const derived = deriveSyncEntity(mut.action);
      if (!derived) {
        failedMutations.push(mut.id);
        continue;
      }
      if (
        (mut.mutationType && mut.mutationType !== derived.mutationType) ||
        (mut.entityType && mut.entityType !== derived.entityType)
      ) {
        // Client-declared metadata disagrees with the server map — loud failure
        failedMutations.push(mut.id);
        continue;
      }

      try {
        const txOutcome = await runWithTx(db, async (tx) => {
          // Idempotency: already-processed client event IDs are acknowledged
          // without re-executing (safe replay after transport retries).
          const query = tx
            .select({ clientEventId: mobileSyncProcessed.clientEventId })
            .from(mobileSyncProcessed)
            .where(eq(mobileSyncProcessed.clientEventId, mut.id));

          const alreadyProcessed = typeof (query as any).get === "function"
            ? await (query as any).get()
            : (await query)[0];

          if (alreadyProcessed) {
            return { alreadyProcessed: true };
          }

          const payload = mut.payload && typeof mut.payload === "object" ? mut.payload : {};
          const clientTimestamp = clampClientTimestamp(mut.timestamp);
          const entityId = extractSyncEntityId(mut.action, payload);
          const serverRecord = entityId
            ? await fetchSyncServerRecord(derived.entityType, entityId, actor, payload, tx)
            : undefined;

          const resolution = resolver.resolveMutation(
            {
              id: mut.id,
              mutationType: derived.mutationType,
              entityType: derived.entityType,
              payload,
              clientTimestamp,
            },
            serverRecord
          );

          let pendingConflict: {
            clientEventId: string;
            entityType: string;
            status: any;
            fields: string[];
          } | null = null;

          if (resolution.status === "SYNCED") {
            // Client-newer (or no server record) — apply the payload.
            await applySyncMutation(actor, mut.action, payload, tx);
          } else {
            // HOLD: server-newer — payload is NOT applied; persist the conflict
            // so it surfaces through GET /sync/conflicts (zero-migration tenant
            // key lives inside conflictDetailsJson).
            const conflictDetails = {
              institutionId: scopedInstitutionId || session.institutionId || null,
              clientEventId: mut.id,
              entityId,
              action: mut.action,
              fields: resolution.conflictFields ?? [],
              status: resolution.status,
              resolvedAt: null as string | null,
            };
            const outboxQuery = tx
              .insert(offlineSyncOutbox)
              .values({
                id: crypto.randomUUID(),
                tenantId,
                userId: session.staffId,
                deviceId,
                mutationType: derived.mutationType,
                entityType: derived.entityType,
                payloadJson: JSON.stringify(payload),
                clientTimestamp,
                syncStatus: resolution.status,
                conflictDetailsJson: JSON.stringify(conflictDetails),
              });
            if (typeof (outboxQuery as any).run === "function") {
              await (outboxQuery as any).run();
            } else {
              await outboxQuery;
            }

            pendingConflict = {
              clientEventId: mut.id,
              entityType: derived.entityType,
              status: resolution.status,
              fields: conflictDetails.fields,
            };
          }

          // Held mutations are terminal for the transport too — recorded so a
          // retry after a lost response cannot double-persist the conflict row.
          const processedQuery = tx
            .insert(mobileSyncProcessed)
            .values({ clientEventId: mut.id, staffId: session.staffId, action: mut.action });
          if (typeof (processedQuery as any).run === "function") {
            await (processedQuery as any).run();
          } else {
            await processedQuery;
          }

          return { alreadyProcessed: false, pendingConflict };
        });

        if (txOutcome?.alreadyProcessed) {
          processedMutations.push(mut.id);
          continue;
        }

        if (txOutcome?.pendingConflict) {
          conflicts.push(txOutcome.pendingConflict);
        }

        // Every conflict id is ALSO in processedMutations (queue calls
        // markConflict, never retries it forever).
        processedMutations.push(mut.id);
      } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(
          `Mobile sync mutation failed (action=${mut.action} id=${mut.id}):`,
          errorMsg
        );
        failedMutations.push(mut.id);

        // Record failed non-transient mutation into DLQ outbox for administrator review
        try {
          if (db?.insert) {
            const dlqDetails = {
              institutionId: scopedInstitutionId || session.institutionId || null,
              clientEventId: mut.id,
              action: mut.action,
              isDlq: true,
              error: errorMsg,
              failedAt: new Date().toISOString(),
            };
            const insertChain = db.insert(offlineSyncOutbox);
            if (insertChain && typeof insertChain.values === "function") {
              const dlqQuery = insertChain
                .values({
                  id: crypto.randomUUID(),
                  tenantId,
                  userId: session.staffId,
                  deviceId,
                  mutationType: derived?.mutationType || "UPDATE",
                  entityType: derived?.entityType || "unknown",
                  payloadJson: JSON.stringify(mut.payload || {}),
                  clientTimestamp: mut.timestamp || new Date().toISOString(),
                  syncStatus: "NEEDS_REVIEW",
                  conflictDetailsJson: JSON.stringify(dlqDetails),
                });
              if (typeof (dlqQuery as any).run === "function") {
                await (dlqQuery as any).run();
              } else {
                await dlqQuery;
              }
            }
          }
        } catch (dlqErr) {
          console.error("Failed to persist DLQ record:", dlqErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      processedMutations,
      failedMutations,
      conflicts,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Mobile sync error:", error);
    return NextResponse.json({ error: "Failed to process mobile sync batch" }, { status: 500 });
  }
}, "mobile:sync");
