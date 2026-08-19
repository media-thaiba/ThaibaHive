/**
 * Vector Clock & Conflict Resolver Unit Tests
 * Part of Sprint-035: Global Multi-Tenant Cross-Region Disaster Recovery Drills & Automated Failover Verification
 */

import { VectorClock } from "../vector-clock";
import { CacheConflictResolver, VersionedCacheValue } from "../conflict-resolver";

describe("VectorClock & CacheConflictResolver", () => {
  it("should compare causal order between vector clocks correctly", () => {
    const vc1 = new VectorClock({ "us-east": 1, "eu-central": 0 });
    const vc2 = new VectorClock({ "us-east": 2, "eu-central": 1 });

    expect(vc2.compare(vc1)).toBe("GREATER");
    expect(vc1.compare(vc2)).toBe("LESSER");

    const vc3 = new VectorClock({ "us-east": 2, "eu-central": 0 });
    const vc4 = new VectorClock({ "us-east": 1, "eu-central": 2 });

    expect(vc3.compare(vc4)).toBe("CONCURRENT");
    expect(vc4.compare(vc3)).toBe("CONCURRENT");
  });

  it("should accept remote update when remote clock dominates local", () => {
    const local: VersionedCacheValue = {
      value: { name: "Old Name" },
      clock: new VectorClock({ "us-east": 1 }),
      updatedAt: 1000,
    };

    const remote: VersionedCacheValue = {
      value: { name: "New Name" },
      clock: new VectorClock({ "us-east": 2 }),
      updatedAt: 1100,
    };

    const resolution = CacheConflictResolver.resolve(local, remote);
    expect(resolution.action).toBe("ACCEPT_REMOTE");
    expect(resolution.winner.value).toEqual({ name: "New Name" });
    expect(resolution.conflictDetected).toBe(false);
  });

  it("should retain local state when local clock dominates remote", () => {
    const local: VersionedCacheValue = {
      value: { name: "Local Latest" },
      clock: new VectorClock({ "eu-central": 3 }),
      updatedAt: 2000,
    };

    const remote: VersionedCacheValue = {
      value: { name: "Stale Remote" },
      clock: new VectorClock({ "eu-central": 1 }),
      updatedAt: 1500,
    };

    const resolution = CacheConflictResolver.resolve(local, remote);
    expect(resolution.action).toBe("APPLY_LOCAL");
    expect(resolution.winner.value).toEqual({ name: "Local Latest" });
    expect(resolution.conflictDetected).toBe(false);
  });

  it("should resolve concurrent conflict via Last-Write-Wins (LWW)", () => {
    const local: VersionedCacheValue = {
      value: { status: "DRAFT" },
      clock: new VectorClock({ "us-east": 2, "ap-south": 0 }),
      updatedAt: 3000,
    };

    const remote: VersionedCacheValue = {
      value: { status: "PUBLISHED" },
      clock: new VectorClock({ "us-east": 0, "ap-south": 2 }),
      updatedAt: 3500, // Newer timestamp wins
    };

    const resolution = CacheConflictResolver.resolve(local, remote);
    expect(resolution.action).toBe("ACCEPT_REMOTE");
    expect(resolution.conflictDetected).toBe(true);
    expect(resolution.winner.value).toEqual({ status: "PUBLISHED" });
  });

  it("should return INVALIDATE_ANOMALY when clock skew exceeds threshold or is invalid", () => {
    const local: VersionedCacheValue = {
      value: { status: "ACTIVE" },
      clock: new VectorClock({ "us-east": 1 }),
      updatedAt: 1000,
    };

    const remote: VersionedCacheValue = {
      value: { status: "SUSPICIOUS" },
      clock: new VectorClock({ "us-east": 2 }),
      updatedAt: 1000 + 86400000 * 30, // 30 days drift anomaly
    };

    const resolution = CacheConflictResolver.resolve(local, remote);
    expect(resolution.action).toBe("INVALIDATE_ANOMALY");
    expect(resolution.conflictDetected).toBe(true);
  });
});
