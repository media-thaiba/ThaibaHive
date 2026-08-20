/**
 * Campus Fleet Logistics & Predictive Vehicle Maintenance Types (AIMS / AutoOps)
 */

export type VehicleType = 'SHUTTLE_BUS' | 'SECURITY_PATROL' | 'LOGISTICS_VAN' | 'ELECTRIC_CART';
export type VehicleStatus = 'IDLE' | 'IN_TRANSIT' | 'CHARGING' | 'MAINTENANCE_REQUIRED' | 'OUT_OF_SERVICE';

export interface VehicleTelemetry {
  vehicleId: string;
  campusId: string;
  vehicleType: VehicleType;
  latitude: number;
  longitude: number;
  speedKmph: number;
  odometerKm: number;
  batterySoCRatio: number; // 0.0 to 1.0 (for EV) or Fuel %
  engineTempCelsius: number;
  brakePadWearPercent: number; // 0 (new) to 100 (fully worn)
  tirePressurePsi: number;
  passengerCount: number;
  maxCapacity: number;
  status: VehicleStatus;
  timestamp: string;
  institutionId: string;
}

export interface RouteStop {
  stopId: string;
  name: string;
  latitude: number;
  longitude: number;
  estimatedArrivalIso: string;
  demandPickupCount: number;
  dropoffCount: number;
}

export interface OptimizedRoutePlan {
  routeId: string;
  vehicleId: string;
  campusId: string;
  stops: RouteStop[];
  totalDistanceKm: number;
  totalDurationMinutes: number;
  fuelEfficiencyKmPerLiter: number;
  projectedCo2EmissionsKg: number;
  status: 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'REROUTED';
  generatedAt: string;
  institutionId: string;
}

export interface VehicleHealthAssessment {
  vehicleId: string;
  compositeHealthScore: number; // 0 to 100
  failureProbabilityNext14Days: number; // 0.0 to 1.0
  urgentMaintenanceRequired: boolean;
  subsystemScores: {
    powertrain: number;
    braking: number;
    batteryElectrical: number;
    tires: number;
  };
  recommendedServiceAction?: string;
  assessedAt: string;
}
