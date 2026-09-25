import { WorkOrderPriority, WorkOrderStatus, WorkOrderCategory } from '../facility-types';

export interface WorkOrderTransitionRequest {
  workOrderNumber: string;
  fromStatus: WorkOrderStatus;
  toStatus: WorkOrderStatus;
  actorId: string;
  actorRole: string;
  notes?: string;
  technicianSignature?: string;
  actualDurationMinutes?: number;
  consumedParts?: { partNumber: string; quantity: number }[];
  photoEvidenceUrls?: string[];
  merkleAuditHash?: string;
}

export interface WorkOrderStateTransitionResult {
  success: boolean;
  workOrderNumber: string;
  previousStatus: WorkOrderStatus;
  currentStatus: WorkOrderStatus;
  transitionTimestamp: string;
  error?: string;
}

export interface TechnicianCandidate {
  technicianId: string;
  name: string;
  specializations: string[];
  currentBuildingId: string;
  currentFloorId: string;
  distanceMeters: number;
  activeCaseload: number;
  compositeRankScore: number; // 0.0 - 1.0 (higher = better fit)
}

export interface SpatialWaypoint {
  stepIndex: number;
  buildingId: string;
  floorId: string;
  roomId?: string;
  coordinates: { x: number; y: number; z: number };
  instruction: string;
}

export interface SpatialRoutePlan {
  technicianId: string;
  equipmentId: string;
  totalDistanceMeters: number;
  estimatedWalkTimeMinutes: number;
  waypoints: SpatialWaypoint[];
  crossFloorTransit: boolean; // elevator or stairs used
}
