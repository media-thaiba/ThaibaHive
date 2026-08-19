/**
 * Last-Write-Wins (LWW) & Vector Clock Conflict Resolver
 * Part of Sprint-035: Global Multi-Tenant Cross-Region Disaster Recovery Drills & Automated Failover Verification
 */

import { VectorClock } from "./vector-clock";

export interface VersionedCacheValue<T = any> {
  value: T;
  clock: VectorClock;
  updatedAt: number;
}

export interface ConflictResolutionResult<T = any> {
  winner: VersionedCacheValue<T>;
  action: "APPLY_LOCAL" | "ACCEPT_REMOTE" | "INVALIDATE_ANOMALY";
  conflictDetected: boolean;
  reason: string;
}

export class CacheConflictResolver {
  public static resolve<T = any>(
    local: VersionedCacheValue<T> | null,
    remote: VersionedCacheValue<T>
  ): ConflictResolutionResult<T> {
    if (!local) {
      return {
        winner: remote,
        action: "ACCEPT_REMOTE",
        conflictDetected: false,
        reason: "No local version exists; accepting incoming remote update",
      };
    }

    // Detect clock anomalies (e.g. invalid timestamps, excessive drift > 7 days)
    if (!Number.isFinite(local.updatedAt) || !Number.isFinite(remote.updatedAt) || Math.abs(remote.updatedAt - local.updatedAt) > 86400000 * 7) {
      return {
        winner: remote,
        action: "INVALIDATE_ANOMALY",
        conflictDetected: true,
        reason: "Causal or clock anomaly detected; invalidating cache entry to trigger clean reload",
      };
    }

    const comparison = local.clock.compare(remote.clock);

    if (comparison === "GREATER") {
      // Local version dominates remote (remote is obsolete)
      return {
        winner: local,
        action: "APPLY_LOCAL",
        conflictDetected: false,
        reason: "Local vector clock is ahead; discarding stale remote update",
      };
    }

    if (comparison === "LESSER") {
      // Remote version dominates local
      return {
        winner: remote,
        action: "ACCEPT_REMOTE",
        conflictDetected: false,
        reason: "Remote vector clock dominates local; accepting remote update",
      };
    }

    if (comparison === "EQUAL") {
      return {
        winner: local,
        action: "APPLY_LOCAL",
        conflictDetected: false,
        reason: "Clocks are equal; retaining local state",
      };
    }

    // CONCURRENT CONFLICT: Apply Last-Write-Wins (LWW) tie breaking
    const conflictDetected = true;

    if (remote.updatedAt > local.updatedAt) {
      // Remote has higher wall-clock timestamp
      const mergedClock = new VectorClock();
      mergedClock.merge(local.clock);
      mergedClock.merge(remote.clock);

      return {
        winner: {
          value: remote.value,
          clock: mergedClock,
          updatedAt: remote.updatedAt,
        },
        action: "ACCEPT_REMOTE",
        conflictDetected,
        reason: "Concurrent conflict resolved via LWW: Remote timestamp is newer",
      };
    } else {
      // Local has higher or equal wall-clock timestamp
      const mergedClock = new VectorClock();
      mergedClock.merge(local.clock);
      mergedClock.merge(remote.clock);

      return {
        winner: {
          value: local.value,
          clock: mergedClock,
          updatedAt: local.updatedAt,
        },
        action: "APPLY_LOCAL",
        conflictDetected,
        reason: "Concurrent conflict resolved via LWW: Local timestamp is newer or equal",
      };
    }
  }
}
