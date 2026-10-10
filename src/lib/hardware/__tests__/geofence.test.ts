import { GeofenceEngine } from "../geofence-engine";
import { db } from "@/db";
import { hardwareZones, institutions } from "@/db/schema";
import { inArray } from "drizzle-orm";

describe("GeofenceEngine", () => {
  const ts = Date.now();
  const tenantA = `inst_geo_a_${ts}`;
  const tenantB = `inst_geo_b_${ts}`;

  beforeAll(async () => {
    await db.insert(institutions).values([
      { id: tenantA, name: "Geofence Campus A", code: `geoa_${ts}` },
      { id: tenantB, name: "Geofence Campus B", code: `geob_${ts}` },
    ]);
  });

  afterAll(async () => {
    await db.delete(hardwareZones).where(inArray(hardwareZones.institutionId, [tenantA, tenantB]));
    await db.delete(institutions).where(inArray(institutions.id, [tenantA, tenantB]));
  });

  beforeEach(async () => {
    await db.delete(hardwareZones).where(inArray(hardwareZones.institutionId, [tenantA, tenantB]));
  });

  describe("Ray-Casting Point-in-Polygon (2D Spatial)", () => {
    // Define a square polygon from (0,0) to (10,10)
    const square: Array<[number, number]> = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ];

    it("correctly identifies points strictly inside polygon", () => {
      expect(GeofenceEngine.isPointInPolygon({ x: 5, y: 5 }, square)).toBe(true);
      expect(GeofenceEngine.isPointInPolygon({ x: 1, y: 1 }, square)).toBe(true);
      expect(GeofenceEngine.isPointInPolygon({ x: 9, y: 9 }, square)).toBe(true);
    });

    it("correctly identifies points outside polygon", () => {
      expect(GeofenceEngine.isPointInPolygon({ x: 15, y: 5 }, square)).toBe(false);
      expect(GeofenceEngine.isPointInPolygon({ x: -2, y: 5 }, square)).toBe(false);
      expect(GeofenceEngine.isPointInPolygon({ x: 5, y: 12 }, square)).toBe(false);
      expect(GeofenceEngine.isPointInPolygon({ x: 5, y: -1 }, square)).toBe(false);
    });

    it("correctly detects points in concave / L-shaped polygons", () => {
      // L-shaped polygon
      const lShape: Array<[number, number]> = [
        [0, 0],
        [10, 0],
        [10, 5],
        [5, 5],
        [5, 10],
        [0, 10],
      ];

      expect(GeofenceEngine.isPointInPolygon({ x: 2, y: 2 }, lShape)).toBe(true); // Inside base
      expect(GeofenceEngine.isPointInPolygon({ x: 2, y: 8 }, lShape)).toBe(true); // Inside top wing
      expect(GeofenceEngine.isPointInPolygon({ x: 8, y: 8 }, lShape)).toBe(false); // In the cut-out corner
    });

    it("returns false for invalid degenerate polygons", () => {
      expect(GeofenceEngine.isPointInPolygon({ x: 1, y: 1 }, [[0, 0], [10, 0]])).toBe(false);
    });
  });

  describe("Zone CRUD & Tenant Isolation", () => {
    it("creates, retrieves, updates, and deletes a zone with isolation", async () => {
      const zone = await GeofenceEngine.createZone(tenantA, {
        name: "Main Auditorium",
        type: "auditorium",
        floorNumber: 1,
        coordinatesX: 10,
        coordinatesY: 20,
        width: 30,
        height: 40,
        boundaryCoordinates: [
          [10, 20],
          [40, 20],
          [40, 60],
          [10, 60],
        ],
      });

      expect(zone.id).toBeDefined();
      expect(zone.institutionId).toBe(tenantA);

      // Verify retrieval
      const fetched = await GeofenceEngine.getZone(tenantA, zone.id);
      expect(fetched?.name).toBe("Main Auditorium");

      // Verify tenant B isolation
      const cross = await GeofenceEngine.getZone(tenantB, zone.id);
      expect(cross).toBeNull();

      // Update zone
      const updated = await GeofenceEngine.updateZone(tenantA, zone.id, {
        name: "Grand Auditorium",
      });
      expect(updated?.name).toBe("Grand Auditorium");

      // Delete zone
      const deleted = await GeofenceEngine.deleteZone(tenantA, zone.id);
      expect(deleted).toBe(true);

      const afterDelete = await GeofenceEngine.getZone(tenantA, zone.id);
      expect(afterDelete).toBeNull();
    });
  });

  describe("Spatial Coordinate to Zone Resolution", () => {
    it("resolves exact zone using polygon boundaries", async () => {
      await GeofenceEngine.createZone(tenantA, {
        name: "Chemistry Lab",
        type: "lab",
        floorNumber: 2,
        boundaryCoordinates: [
          [50, 50],
          [100, 50],
          [100, 100],
          [50, 100],
        ],
      });

      await GeofenceEngine.createZone(tenantA, {
        name: "Physics Lab",
        type: "lab",
        floorNumber: 2,
        boundaryCoordinates: [
          [110, 50],
          [160, 50],
          [160, 100],
          [110, 100],
        ],
      });

      const matchedZone = await GeofenceEngine.resolveZoneForCoordinates(tenantA, {
        x: 75,
        y: 75,
        floorNumber: 2,
      });

      expect(matchedZone).not.toBeNull();
      expect(matchedZone?.name).toBe("Chemistry Lab");

      const physicsMatch = await GeofenceEngine.resolveZoneForCoordinates(tenantA, {
        x: 130,
        y: 80,
        floorNumber: 2,
      });
      expect(physicsMatch?.name).toBe("Physics Lab");

      // Point outside any zone
      const noMatch = await GeofenceEngine.resolveZoneForCoordinates(tenantA, {
        x: 200,
        y: 200,
        floorNumber: 2,
      });
      expect(noMatch).toBeNull();
    });

    it("falls back to bounding box coordinates when polygon metadata is absent", async () => {
      await GeofenceEngine.createZone(tenantA, {
        name: "Library Wing",
        type: "library",
        floorNumber: 1,
        coordinatesX: 0,
        coordinatesY: 0,
        width: 50,
        height: 50,
      });

      const match = await GeofenceEngine.resolveZoneForCoordinates(tenantA, {
        x: 25,
        y: 25,
        floorNumber: 1,
      });

      expect(match).not.toBeNull();
      expect(match?.name).toBe("Library Wing");
    });
  });
});
