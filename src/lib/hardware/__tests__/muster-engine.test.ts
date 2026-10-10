import { MusterEngine } from "../muster-engine";
import { GeofenceEngine } from "../geofence-engine";
import { db } from "@/db";
import { hardwareZones, hardwareBadges, institutions } from "@/db/schema";
import { inArray } from "drizzle-orm";

describe("MusterEngine", () => {
  const ts = Date.now();
  const tenantA = `inst_muster_a_${ts}`;
  const tenantB = `inst_muster_b_${ts}`;

  beforeAll(async () => {
    await db.insert(institutions).values([
      { id: tenantA, name: "Muster Campus A", code: `musta_${ts}` },
      { id: tenantB, name: "Muster Campus B", code: `mustb_${ts}` },
    ]);
  });

  afterAll(async () => {
    await db.delete(hardwareBadges).where(inArray(hardwareBadges.institutionId, [tenantA, tenantB]));
    await db.delete(hardwareZones).where(inArray(hardwareZones.institutionId, [tenantA, tenantB]));
    await db.delete(institutions).where(inArray(institutions.id, [tenantA, tenantB]));
  });

  beforeEach(async () => {
    await db.delete(hardwareBadges).where(inArray(hardwareBadges.institutionId, [tenantA, tenantB]));
    await db.delete(hardwareZones).where(inArray(hardwareZones.institutionId, [tenantA, tenantB]));
  });

  describe("Emergency Muster Headcount Accounting", () => {
    it("accurately categorizes occupants between assembly points and missing areas", async () => {
      // 1. Create a designated muster point zone and an internal lab zone
      const musterZone = await GeofenceEngine.createZone(tenantA, {
        name: "North Football Field Muster Point",
        type: "muster_point",
        isMusterPoint: true,
        floorNumber: 0,
      });

      const labZone = await GeofenceEngine.createZone(tenantA, {
        name: "Chemistry Lab 3rd Floor",
        type: "lab",
        isMusterPoint: false,
        floorNumber: 3,
      });

      const now = new Date().toISOString();

      // 2. Insert badges: 2 at muster point, 1 inside lab zone
      await db.insert(hardwareBadges).values([
        {
          id: `hwb_1_${ts}`,
          institutionId: tenantA,
          badgeId: "BADGE-101",
          badgeType: "ble_beacon",
          credentialType: "staff_id",
          validFrom: now,
          status: "active",
          lastUsedZoneId: musterZone.id,
          lastUsedAt: now,
          updatedAt: now,
        },
        {
          id: `hwb_2_${ts}`,
          institutionId: tenantA,
          badgeId: "BADGE-102",
          badgeType: "ble_beacon",
          credentialType: "staff_id",
          validFrom: now,
          status: "active",
          lastUsedZoneId: musterZone.id,
          lastUsedAt: now,
          updatedAt: now,
        },
        {
          id: `hwb_3_${ts}`,
          institutionId: tenantA,
          badgeId: "BADGE-103",
          badgeType: "ble_beacon",
          credentialType: "student_id",
          validFrom: now,
          status: "active",
          lastUsedZoneId: labZone.id,
          lastUsedAt: now,
          updatedAt: now,
        },
      ]);

      const report = await MusterEngine.calculateMusterHeadcount(tenantA);

      expect(report.institutionId).toBe(tenantA);
      expect(report.totalOccupantsOnSite).toBe(3);
      expect(report.accountedInMusterCount).toBe(2);
      expect(report.missingOccupantsCount).toBe(1);
      expect(report.evacuationPercentage).toBeCloseTo(66.7, 1);

      // Check muster zone breakdown
      const fieldReport = report.musterZones.find((z) => z.zoneId === musterZone.id);
      expect(fieldReport).toBeDefined();
      expect(fieldReport?.occupantCount).toBe(2);

      // Check missing occupants list
      expect(report.missingOccupants.length).toBe(1);
      expect(report.missingOccupants[0].badgeId).toBe("BADGE-103");
      expect(report.missingOccupants[0].lastSeenZoneName).toBe("Chemistry Lab 3rd Floor");
    });

    it("reports 100% evacuation when all active badges are accounted for", async () => {
      const musterPoint = await GeofenceEngine.createZone(tenantA, {
        name: "Main Lawn Muster Area",
        type: "muster_point",
        isMusterPoint: true,
      });

      const now = new Date().toISOString();

      await db.insert(hardwareBadges).values([
        {
          id: `hwb_evac_1_${ts}`,
          institutionId: tenantA,
          badgeId: "BADGE-201",
          badgeType: "ble_beacon",
          credentialType: "visitor_pass",
          validFrom: now,
          status: "active",
          lastUsedZoneId: musterPoint.id,
          lastUsedAt: now,
          updatedAt: now,
        },
      ]);

      const report = await MusterEngine.calculateMusterHeadcount(tenantA);
      expect(report.totalOccupantsOnSite).toBe(1);
      expect(report.accountedInMusterCount).toBe(1);
      expect(report.missingOccupantsCount).toBe(0);
      expect(report.evacuationPercentage).toBe(100);
      expect(report.missingOccupants).toHaveLength(0);
    });
  });
});
