export type FacilityType = 'academic' | 'residential' | 'administrative' | 'recreational' | 'laboratory';
export type FacilityStatus = 'operational' | 'maintenance' | 'evacuating' | 'closed';

export type SpaceType = 'classroom' | 'laboratory' | 'office' | 'auditorium' | 'study_room' | 'corridor' | 'utility';
export type SpaceStatus = 'available' | 'occupied' | 'reserved' | 'hazard_restricted' | 'maintenance';

export type SensorType = 'temperature' | 'humidity' | 'co2' | 'noise' | 'occupancy_pir' | 'energy_power' | 'smoke_fire' | 'ble_gateway';
export type SensorProtocol = 'mqtt' | 'coap' | 'http_webhook' | 'ble_mesh';
export type SensorStatus = 'online' | 'offline' | 'degraded' | 'calibrating';

export type MetricType =
  | 'temperature_c'
  | 'humidity_pct'
  | 'co2_ppm'
  | 'noise_db'
  | 'occupancy_count'
  | 'power_kw'
  | 'air_quality_index'
  | 'rssi_dbm';

export type AssetCategory = 'lab_equipment' | 'it_hardware' | 'av_multimedia' | 'furniture' | 'medical_device' | 'fleet_vehicle';
export type AssetStatus = 'in_place' | 'in_transit' | 'geofence_breach' | 'maintenance' | 'missing';

export type GeofenceSeverity = 'low' | 'medium' | 'high' | 'critical';
export type PerimeterType = 'polygon' | 'bounding_box' | 'radius_sphere';

export type MaintenancePriority = 'low' | 'medium' | 'high' | 'critical';
export type MaintenanceStatus = 'pending' | 'dispatched' | 'in_progress' | 'completed' | 'cancelled';
export type MaintenanceSource = 'ai_predicted' | 'sensor_alarm' | 'manual_staff' | 'geofence_breach';

export type WayfindingNodeType = 'room_entrance' | 'hallway_intersection' | 'stairwell' | 'elevator' | 'emergency_exit' | 'outdoor_gate';
export type HazardType = 'none' | 'smoke' | 'fire' | 'construction' | 'flooded';

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface BoundingBox3D {
  min: Point3D;
  max: Point3D;
}

export interface Polygon2D {
  points: [number, number][]; // [x, y] coordinates
}

export interface SpatialDimensions {
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
}

export interface SpatialTelemetryFrame {
  telemetryId: string;
  sensorId: string;
  facilityId: string;
  spaceId?: string;
  metricType: MetricType;
  value: number;
  unit: string;
  isAnomaly: boolean;
  timestamp: string;
}

export interface SpaceComfortScore {
  spaceId: string;
  overallScore: number; // 0 - 100
  temperatureScore: number; // 0 - 100
  airQualityScore: number; // 0 - 100
  noiseScore: number; // 0 - 100
  occupancyRatio: number; // 0.0 - 1.0
  recommendation: string;
}

export interface OccupancyForecastPoint {
  timestamp: string;
  hour: number;
  predictedOccupancy: number;
  capacity: number;
  confidenceLower: number;
  confidenceUpper: number;
  utilizationPct: number;
}

export interface SpaceOptimizationPlan {
  planId: string;
  facilityId: string;
  generatedAt: string;
  totalSpacesAnalyzed: number;
  overallUtilizationGainPct: number;
  projectedEnergyReductionKwh: number;
  reallocations: Array<{
    courseOrEventId: string;
    fromSpaceId: string;
    toSpaceId: string;
    reason: string;
    expectedUtilizationGain: number;
  }>;
  hvacSetbacks: Array<{
    spaceId: string;
    startTime: string;
    endTime: string;
    targetTempC: number;
    kwhSaved: number;
  }>;
}

export interface WayfindingRoute {
  routeId: string;
  facilityId: string;
  sourceNodeId: string;
  targetNodeId: string;
  totalDistanceMeters: number;
  totalTransitTimeSeconds: number;
  isStepFree: boolean;
  isEmergencyRoute: boolean;
  pathNodes: Array<{
    nodeId: string;
    floorLevel: number;
    nodeType: WayfindingNodeType;
    coordinates: Point3D;
    instruction: string;
  }>;
  polyline: Point3D[];
}

export interface GeofenceEvent {
  eventId: string;
  assetId: string;
  geofenceId: string;
  eventType: 'enter' | 'exit' | 'breach';
  coordinates: Point3D;
  timestamp: string;
  severity: GeofenceSeverity;
  details: string;
}
