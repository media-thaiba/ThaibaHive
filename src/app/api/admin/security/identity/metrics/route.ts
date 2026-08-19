import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { withDPoP } from "@/lib/identity/dpop-middleware";
import { revocationStore } from "@/lib/identity/revocation-store";
import { getMigrationStats } from "@/lib/identity/migration-layer";
import { db } from "@/db";
import { identity_sessions, device_fingerprints } from "@thaiba/db/schema";

export const GET = withDPoP(requireAuth(async (_req) => {
  const revStats = revocationStore.getStats();
  const recentRevocations = revocationStore.getRecentRecords(20);

  // 1. Real migration stats
  const migrationProgress = await getMigrationStats();

  // 2. Real session distribution from identity_sessions table
  let sessionDistribution = {
    dpop: migrationProgress.migrated,
    legacy: migrationProgress.legacy,
    total: migrationProgress.total,
  };

  try {
    const sessions = await db.select().from(identity_sessions).all();
    const dpopCount = sessions.filter((s) => s.dpop_migrated || !!s.dpop_thumbprint).length;
    const legacyCount = sessions.length - dpopCount;
    sessionDistribution = {
      dpop: dpopCount,
      legacy: legacyCount,
      total: sessions.length,
    };
  } catch {
    // Fallback if unseeded
  }

  // 3. Real device trust scores from device_fingerprints table
  const deviceTrustScores = {
    high: 0,
    medium: 0,
    low: 0,
  };

  try {
    const devices = await db.select().from(device_fingerprints).all();
    for (const dev of devices) {
      if (dev.trust_score >= 80) deviceTrustScores.high++;
      else if (dev.trust_score >= 50) deviceTrustScores.medium++;
      else deviceTrustScores.low++;
    }
  } catch {
    // Fallback if unseeded
  }

  // 4. Recent risk events from revocation records and store
  const recentRiskEvents = recentRevocations.map((r) => ({
    type: "session.revoked",
    userId: r.userId,
    score: null,
    timestamp: r.revokedAt,
    reason: r.reason,
  }));

  // 5. Revocation velocity
  const oneMinuteAgo = Date.now() - 60_000;
  const last24hAgo = Date.now() - 86_400_000;
  const perMinute = recentRevocations.filter(
    (r) => new Date(r.revokedAt).getTime() > oneMinuteAgo,
  ).length;
  const last24h = recentRevocations.filter(
    (r) => new Date(r.revokedAt).getTime() > last24hAgo,
  ).length;

  return NextResponse.json({
    sessionDistribution,
    deviceTrustScores,
    recentRiskEvents,
    revocationVelocity: { perMinute, last24h },
    migrationProgress,
    revocationStats: revStats,
  });
}, "system:security:view"), { required: false });
