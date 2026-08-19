import { EventBus } from "@/lib/observability/event-bus";
import { defaultClusterClient } from "@/lib/redis/redis-cluster-client";
import { revocationStore } from "./revocation-store";
import { logIdentityEvent } from "./identity-audit-events";
import { recordRevocationPropagation, incrementFallback } from "./revocation-metrics";

const REVOCATION_CHANNEL = "identity:revocation";

export interface RevocationEvent {
  sessionId: string;
  userId: string;
  reason: string;
  timestamp: string;
}

let meshInitialized = false;

/**
 * Publishes a credential revocation event to Redis distributed state and EventBus mesh.
 * Tracks sub-50ms propagation latency and logs fallback counters when mesh fails.
 */
export function publishRevocation(
  sessionId: string,
  userId: string,
  reason: string,
): void {
  const startTime = Date.now();
  const event: RevocationEvent = {
    sessionId,
    userId,
    reason,
    timestamp: new Date().toISOString(),
  };

  try {
    // 1. Sync to distributed Redis store
    const redisKey = defaultClusterClient.formatTenantKey("global", "revocation", sessionId);
    defaultClusterClient.set(redisKey, JSON.stringify(event), 7 * 24 * 3600).catch(() => {
      incrementFallback();
    });

    // 2. Broadcast via EventBus pubsub channel
    EventBus.getInstance().publishEvent({
      eventSource: REVOCATION_CHANNEL,
      severity: "warning",
      message: JSON.stringify(event),
    });

    const elapsedMs = Math.max(1, Date.now() - startTime);
    recordRevocationPropagation(elapsedMs);
  } catch (err) {
    incrementFallback();
    // Central revocation store remains authoritative fallback
    console.warn("[RevocationMesh] PubSub publish failed, central store remains authoritative:", err);
  }
}

/**
 * Subscribes to revocation events published on the mesh.
 * Returns an unsubscribe function.
 */
export function subscribeToRevocations(
  callback: (event: RevocationEvent) => void,
): () => void {
  return EventBus.getInstance().subscribe((observabilityEvent) => {
    if (
      observabilityEvent.type === "event" &&
      observabilityEvent.data.eventSource === REVOCATION_CHANNEL
    ) {
      try {
        const rev = JSON.parse(observabilityEvent.data.message) as RevocationEvent;
        callback(rev);
      } catch {
        // Malformed message — ignore
      }
    }
  });
}

/**
 * Initializes the revocation mesh subscription so this node
 * keeps its local bloom filter and revocation store in sync.
 */
export function initRevocationMesh(): () => void {
  if (meshInitialized) return () => {};
  meshInitialized = true;

  const unsubscribe = subscribeToRevocations((rev) => {
    revocationStore.revoke(rev.sessionId, rev.userId, rev.reason);
    logIdentityEvent({
      eventType: "revocation.propagated",
      userId: rev.userId,
      reason: rev.reason,
    }).catch(() => {});
  });

  return () => {
    meshInitialized = false;
    unsubscribe();
  };
}
