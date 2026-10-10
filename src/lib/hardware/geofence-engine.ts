import { db } from "@/db";
import { hardwareZones } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export interface ZonePolygon {
  points: Array<[number, number]>; // Array of [x, y] vertices
}

export class GeofenceEngine {
  /**
   * Ray-casting algorithm to determine if a 2D coordinate is inside a polygon boundary
   */
  static isPointInPolygon(
    point: { x: number; y: number },
    polygon: Array<[number, number]>
  ): boolean {
    if (polygon.length < 3) return false;

    let inside = false;
    const { x, y } = point;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0];
      const yi = polygon[i][1];
      const xj = polygon[j][0];
      const yj = polygon[j][1];

      const intersect =
        yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

      if (intersect) inside = !inside;
    }

    return inside;
  }

  /**
   * Create a new campus zone
   */
  static async createZone(
    institutionId: string,
    input: {
      name: string;
      type: string;
      parentZoneId?: string | null;
      floorNumber?: number | null;
      coordinatesX?: number | null;
      coordinatesY?: number | null;
      coordinatesZ?: number | null;
      width?: number | null;
      height?: number | null;
      pathLossExponent?: number | null;
      wallAttenuationDb?: number | null;
      isMusterPoint?: boolean;
      emergencyEgressRoute?: string | null;
      boundaryCoordinates?: Array<[number, number]> | null;
      metadataJson?: string | null;
    }
  ) {
    const id = `hwz_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();

    let meta = input.metadataJson;
    if (input.boundaryCoordinates) {
      try {
        const parsed = meta ? JSON.parse(meta) : {};
        parsed.boundary = input.boundaryCoordinates;
        meta = JSON.stringify(parsed);
      } catch {
        meta = JSON.stringify({ boundary: input.boundaryCoordinates });
      }
    }

    const newZone = {
      id,
      institutionId,
      name: input.name,
      type: input.type,
      parentZoneId: input.parentZoneId || null,
      floorNumber: input.floorNumber ?? 0,
      coordinatesX: input.coordinatesX ?? null,
      coordinatesY: input.coordinatesY ?? null,
      coordinatesZ: input.coordinatesZ ?? null,
      width: input.width ?? null,
      height: input.height ?? null,
      pathLossExponent: input.pathLossExponent ?? 3.0,
      wallAttenuationDb: input.wallAttenuationDb ?? 0,
      isMusterPoint: input.isMusterPoint || false,
      emergencyEgressRoute: input.emergencyEgressRoute || null,
      metadataJson: meta || null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(hardwareZones).values(newZone);
    return newZone;
  }

  /**
   * Get zone by ID
   */
  static async getZone(institutionId: string, zoneId: string) {
    const rows = await db
      .select()
      .from(hardwareZones)
      .where(
        and(
          eq(hardwareZones.id, zoneId),
          eq(hardwareZones.institutionId, institutionId)
        )
      )
      .limit(1);

    return rows[0] || null;
  }

  /**
   * List zones for institution with filters
   */
  static async listZones(
    institutionId: string,
    filters?: {
      type?: string;
      floorNumber?: number;
      isMusterPoint?: boolean;
      isActive?: boolean;
    }
  ) {
    const conditions = [eq(hardwareZones.institutionId, institutionId)];

    if (filters?.type) {
      conditions.push(eq(hardwareZones.type, filters.type));
    }
    if (filters?.floorNumber !== undefined) {
      conditions.push(eq(hardwareZones.floorNumber, filters.floorNumber));
    }
    if (filters?.isMusterPoint !== undefined) {
      conditions.push(eq(hardwareZones.isMusterPoint, filters.isMusterPoint));
    }
    if (filters?.isActive !== undefined) {
      conditions.push(eq(hardwareZones.isActive, filters.isActive));
    }

    return db
      .select()
      .from(hardwareZones)
      .where(and(...conditions))
      .orderBy(desc(hardwareZones.createdAt));
  }

  /**
   * Update zone configuration
   */
  static async updateZone(
    institutionId: string,
    zoneId: string,
    input: Partial<{
      name: string;
      type: string;
      parentZoneId: string | null;
      floorNumber: number | null;
      coordinatesX: number | null;
      coordinatesY: number | null;
      width: number | null;
      height: number | null;
      pathLossExponent: number | null;
      wallAttenuationDb: number | null;
      isMusterPoint: boolean;
      emergencyEgressRoute: string | null;
      metadataJson: string | null;
      isActive: boolean;
    }>
  ) {
    const existing = await this.getZone(institutionId, zoneId);
    if (!existing) return null;

    const now = new Date().toISOString();
    const updateData: Record<string, any> = {
      updatedAt: now,
      ...input,
    };

    await db
      .update(hardwareZones)
      .set(updateData)
      .where(
        and(
          eq(hardwareZones.id, zoneId),
          eq(hardwareZones.institutionId, institutionId)
        )
      );

    return { ...existing, ...updateData };
  }

  /**
   * Resolve which zone contains the specified point coordinates
   */
  static async resolveZoneForCoordinates(
    institutionId: string,
    coords: { x: number; y: number; floorNumber?: number }
  ) {
    const zones = await this.listZones(institutionId, {
      floorNumber: coords.floorNumber,
      isActive: true,
    });

    for (const z of zones) {
      if (z.metadataJson) {
        try {
          const meta = JSON.parse(z.metadataJson);
          if (Array.isArray(meta.boundary) && meta.boundary.length >= 3) {
            if (this.isPointInPolygon(coords, meta.boundary)) {
              return z;
            }
          }
        } catch {}
      }

      // Fallback to bounding box (width x height) if origin coordinates are set
      if (
        z.coordinatesX !== null &&
        z.coordinatesY !== null &&
        z.width !== null &&
        z.height !== null
      ) {
        const xMin = z.coordinatesX;
        const xMax = z.coordinatesX + z.width;
        const yMin = z.coordinatesY;
        const yMax = z.coordinatesY + z.height;

        if (
          coords.x >= xMin &&
          coords.x <= xMax &&
          coords.y >= yMin &&
          coords.y <= yMax
        ) {
          return z;
        }
      }
    }

    return null;
  }

  /**
   * Delete a zone
   */
  static async deleteZone(institutionId: string, zoneId: string) {
    const existing = await this.getZone(institutionId, zoneId);
    if (!existing) return false;

    await db
      .delete(hardwareZones)
      .where(
        and(
          eq(hardwareZones.id, zoneId),
          eq(hardwareZones.institutionId, institutionId)
        )
      );

    return true;
  }
}
