/**
 * Cross-Campus Distributed Resource Mesh Types (AIMS / AutoOps)
 */

export type ResourceCategory = 'LECTURE_HALL' | 'RESEARCH_LAB' | 'COMPUTE_CLUSTER' | 'FLEET_VEHICLE' | 'SPECIALIZED_EQUIPMENT';

export interface CampusResource {
  resourceId: string;
  campusId: string;
  name: string;
  category: ResourceCategory;
  capacityUnits: number;
  isShareableCrossCampus: boolean;
  hourlyCostRateDollars: number;
  activeReservations: ResourceReservation[];
  institutionId: string;
}

export interface ResourceReservation {
  reservationId: string;
  resourceId: string;
  requestingCampusId: string;
  hostCampusId: string;
  reservedByUserId: string;
  startTimeIso: string;
  endTimeIso: string;
  unitsReserved: number;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  lamportTimestamp: number;
}

export interface CapacityAllocation {
  resourceId: string;
  resourceName: string;
  hostCampusId: string;
  allocatedToCampusId: string;
  utilizationRatePercent: number;
  costSavingsDollars: number;
}
