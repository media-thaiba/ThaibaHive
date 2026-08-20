import { Point3D, GeofenceEvent, GeofenceSeverity, Polygon2D } from '../twin-types';
import { BoundingVolume } from '../spatial/bounding-volume';

export interface GeofenceDefinition {
  geofenceId: string;
  facilityId: string;
  name: string;
  polygon: Polygon2D;
  minZ?: number;
  maxZ?: number;
  alertOnExit: boolean;
  alertOnEntry: boolean;
  severity: GeofenceSeverity;
  allowedAssetIds?: string[];
}

export class GeofenceMonitor {
  private geofences: Map<string, GeofenceDefinition> = new Map();
  private assetPresence: Map<string, Set<string>> = new Map(); // assetId -> Set of geofenceIds where it was last seen

  public registerGeofence(geofence: GeofenceDefinition): void {
    this.geofences.set(geofence.geofenceId, geofence);
  }

  public removeGeofence(geofenceId: string): void {
    this.geofences.delete(geofenceId);
  }

  /**
   * Check an asset position against all registered geofences
   */
  public evaluateAssetPosition(assetId: string, position: Point3D): GeofenceEvent[] {
    const events: GeofenceEvent[] = [];
    const currentInside = this.assetPresence.get(assetId) || new Set<string>();
    const newInside = new Set<string>();

    for (const [geoId, geo] of this.geofences.entries()) {
      // Check Z bounds if defined
      if (geo.minZ !== undefined && position.z < geo.minZ) continue;
      if (geo.maxZ !== undefined && position.z > geo.maxZ) continue;

      const isInside = BoundingVolume.isPointInPolygon(geo.polygon, position.x, position.y);

      if (isInside) {
        newInside.add(geoId);
        // Entry transition
        if (!currentInside.has(geoId) && geo.alertOnEntry) {
          events.push({
            eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            assetId,
            geofenceId: geoId,
            eventType: 'enter',
            coordinates: position,
            timestamp: new Date().toISOString(),
            severity: geo.severity,
            details: `Asset entered restricted zone: ${geo.name}`,
          });
        }
      } else {
        // Exit transition
        if (currentInside.has(geoId) && geo.alertOnExit) {
          const isBreach = geo.allowedAssetIds ? !geo.allowedAssetIds.includes(assetId) : true;
          events.push({
            eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            assetId,
            geofenceId: geoId,
            eventType: isBreach ? 'breach' : 'exit',
            coordinates: position,
            timestamp: new Date().toISOString(),
            severity: geo.severity,
            details: `Asset exited perimeter without authorization: ${geo.name}`,
          });
        }
      }
    }

    this.assetPresence.set(assetId, newInside);
    return events;
  }

  public clear(): void {
    this.geofences.clear();
    this.assetPresence.clear();
  }
}
