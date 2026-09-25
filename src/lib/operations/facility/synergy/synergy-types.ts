export interface EcoPeakShaveCommand {
  eventId: string;
  tariffRatePerKwh: number;
  targetCurtailmentKw: number;
  durationMinutes: number;
  setbackDegreesCelsius: number;
  exemptZones: string[];
}

export interface EcoLoadShedResult {
  eventId: string;
  facilitiesShedded: {
    buildingId: string;
    equipmentTag: string;
    previousSetpointC: number;
    newSetpointC: number;
    estimatedPowerSavedKw: number;
  }[];
  totalPowerCurtailmentKw: number;
  exemptionsHonored: string[];
  status: 'executed' | 'partial' | 'safety_blocked';
}

export interface VisionSafetyEvent {
  visionAlertId: string;
  cameraId: string;
  buildingId: string;
  floorId: string;
  roomId?: string;
  eventType: 'elevator_entrapment' | 'smoke_detected' | 'water_pooling' | 'fire_door_blocked' | 'structural_tampering';
  confidenceScore: number;
  timestamp: string;
}

export interface CorrelatedEmergencyDispatchResult {
  visionAlertId: string;
  emergencyWorkOrderId: string;
  priority: 'emergency';
  bmsLockoutApplied: boolean;
  evacuationTriggered: boolean;
  dispatchedTechnicians: string[];
  summary: string;
}
