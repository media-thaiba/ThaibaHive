import { db } from "@/db";
import { hardwareZones, hardwareBadges } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export interface MusterZoneSummary {
  zoneId: string;
  zoneName: string;
  floorNumber: number;
  occupantCount: number;
}

export interface MissingOccupant {
  badgeId: string;
  userId?: string | null;
  userName: string;
  userType: string;
  lastSeenZoneName: string;
  lastSeenTimestamp: string;
}

export interface MusterReport {
  institutionId: string;
  timestamp: string;
  totalOccupantsOnSite: number;
  accountedInMusterCount: number;
  missingOccupantsCount: number;
  evacuationPercentage: number;
  musterZones: MusterZoneSummary[];
  missingOccupants: MissingOccupant[];
}

export class MusterEngine {
  /**
   * Calculate emergency muster accounting (accounted vs missing persons)
   */
  static async calculateMusterHeadcount(institutionId: string): Promise<MusterReport> {
    const now = new Date().toISOString();

    // 1. Get designated muster assembly zones
    const musterZones = await db
      .select()
      .from(hardwareZones)
      .where(
        and(
          eq(hardwareZones.institutionId, institutionId),
          eq(hardwareZones.isMusterPoint, true),
          eq(hardwareZones.isActive, true)
        )
      );

    const musterZoneIds = new Set(musterZones.map((z) => z.id));

    // 2. Get active badges currently on-campus (e.g. status='active' and not 'outside')
    const activeBadges = await db
      .select()
      .from(hardwareBadges)
      .where(
        and(
          eq(hardwareBadges.institutionId, institutionId),
          eq(hardwareBadges.status, "active")
        )
      );

    // Filter to those currently inside campus (or has lastUsedAt)
    const onSiteBadges = activeBadges.filter((b) => b.lastUsedAt !== null);

    const musterCounts: Record<string, number> = {};
    for (const mz of musterZones) {
      musterCounts[mz.id] = 0;
    }

    const missingOccupants: MissingOccupant[] = [];
    let accountedCount = 0;

    for (const b of onSiteBadges) {
      const isAtMuster = b.lastUsedZoneId && musterZoneIds.has(b.lastUsedZoneId);

      if (isAtMuster && b.lastUsedZoneId) {
        accountedCount++;
        musterCounts[b.lastUsedZoneId] = (musterCounts[b.lastUsedZoneId] || 0) + 1;
      } else {
        // Resolve last seen zone name
        let zoneName = "Unknown Area";
        if (b.lastUsedZoneId) {
          const zoneRows = await db
            .select({ name: hardwareZones.name })
            .from(hardwareZones)
            .where(
              and(
                eq(hardwareZones.id, b.lastUsedZoneId),
                eq(hardwareZones.institutionId, institutionId)
              )
            )
            .limit(1);
          if (zoneRows[0]?.name) {
            zoneName = zoneRows[0].name;
          }
        }

        missingOccupants.push({
          badgeId: b.badgeId,
          userId: b.staffId || b.studentId || null,
          userName: b.staffId ? `Staff ${b.staffId}` : b.studentId ? `Student ${b.studentId}` : `Badge ${b.badgeId}`,
          userType: b.staffId ? "staff" : b.studentId ? "student" : "visitor",
          lastSeenZoneName: zoneName,
          lastSeenTimestamp: b.lastUsedAt || b.updatedAt,
        });
      }
    }

    const total = onSiteBadges.length;
    const evacuationPercentage = total > 0 ? Math.round((accountedCount / total) * 100 * 10) / 10 : 100;

    const musterZoneSummaries: MusterZoneSummary[] = musterZones.map((z) => ({
      zoneId: z.id,
      zoneName: z.name,
      floorNumber: z.floorNumber || 0,
      occupantCount: musterCounts[z.id] || 0,
    }));

    return {
      institutionId,
      timestamp: now,
      totalOccupantsOnSite: total,
      accountedInMusterCount: accountedCount,
      missingOccupantsCount: missingOccupants.length,
      evacuationPercentage,
      musterZones: musterZoneSummaries,
      missingOccupants,
    };
  }
}
