import { VisionDbStore } from '../../../db/vision-store';
import { ParkingOccupancyIndexer, ParkingLotCapacity } from './parking-occupancy-indexer';

export interface GateAccessDecision {
  plateNumber: string;
  isAuthorized: boolean;
  isBlacklisted: boolean;
  gateActuated: boolean;
  permitStatus: 'authorized_staff' | 'authorized_student' | 'visitor_pass' | 'unauthorized' | 'blacklisted';
  reason: string;
  parkingCapacity?: ParkingLotCapacity;
}

export class GateAccessController {
  private dbStore: VisionDbStore;
  private parkingIndexer: ParkingOccupancyIndexer;

  constructor(dbStore?: VisionDbStore, parkingIndexer?: ParkingOccupancyIndexer) {
    this.dbStore = dbStore || VisionDbStore.getInstance();
    this.parkingIndexer = parkingIndexer || new ParkingOccupancyIndexer();
  }

  public async evaluateGateAccess(
    plateNumber: string,
    gateId: string,
    facilityId: string,
    direction: 'entry' | 'exit',
    tenantId: string = 'global'
  ): Promise<GateAccessDecision> {
    const permit = await this.dbStore.getVehicleWhitelistByPlate(plateNumber, tenantId);

    if (permit?.isBlacklisted) {
      return {
        plateNumber,
        isAuthorized: false,
        isBlacklisted: true,
        gateActuated: false,
        permitStatus: 'blacklisted',
        reason: `Vehicle on security blacklist: ${permit.blacklistReason || 'Security risk'}`,
      };
    }

    if (permit && permit.status === 'active') {
      const permitStatus = permit.ownerType === 'student' ? 'authorized_student' : 'authorized_staff';
      const delta = direction === 'entry' ? 1 : -1;
      const parkingCapacity = this.parkingIndexer.updateOccupancy(facilityId, delta);

      return {
        plateNumber,
        isAuthorized: true,
        isBlacklisted: false,
        gateActuated: true,
        permitStatus,
        reason: `Permit verified for ${permit.ownerName} (${permit.ownerType})`,
        parkingCapacity,
      };
    }

    // Unauthorized / unregistered plate
    return {
      plateNumber,
      isAuthorized: false,
      isBlacklisted: false,
      gateActuated: false,
      permitStatus: 'unauthorized',
      reason: 'No active permit or visitor pass registered for this vehicle',
    };
  }

  public getParkingIndexer(): ParkingOccupancyIndexer {
    return this.parkingIndexer;
  }
}
