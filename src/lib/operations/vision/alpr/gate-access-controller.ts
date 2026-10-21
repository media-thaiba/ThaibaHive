import { VisionDbStore } from '../../../db/vision-store';
import { ParkingOccupancyIndexer, ParkingLotCapacity } from './parking-occupancy-indexer';

export interface GateAccessDecision {
  plateNumber: string;
  isAuthorized: boolean;
  isBlacklisted: boolean;
  gateActuated: boolean;
  permitStatus: 'authorized_staff' | 'authorized_student' | 'visitor_pass' | 'unauthorized' | 'blacklisted' | 'expired' | 'suspended';
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
    const normalizedPlate = (plateNumber || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (!normalizedPlate) {
      return {
        plateNumber: plateNumber || '',
        isAuthorized: false,
        isBlacklisted: false,
        gateActuated: false,
        permitStatus: 'unauthorized',
        reason: 'Invalid or empty license plate string',
      };
    }

    const permit = await this.dbStore.getVehicleWhitelistByPlate(normalizedPlate, tenantId);

    if (permit?.isBlacklisted) {
      return {
        plateNumber: normalizedPlate,
        isAuthorized: false,
        isBlacklisted: true,
        gateActuated: false,
        permitStatus: 'blacklisted',
        reason: `Vehicle on security blacklist: ${permit.blacklistReason || 'Security risk'}`,
      };
    }

    if (permit && permit.status === 'suspended') {
      return {
        plateNumber: normalizedPlate,
        isAuthorized: false,
        isBlacklisted: false,
        gateActuated: false,
        permitStatus: 'suspended',
        reason: `Vehicle permit suspended for ${permit.ownerName}`,
      };
    }

    if (permit && (permit.status === 'expired' || (permit.validTo && new Date(permit.validTo).getTime() < Date.now()))) {
      return {
        plateNumber: normalizedPlate,
        isAuthorized: false,
        isBlacklisted: false,
        gateActuated: false,
        permitStatus: 'expired',
        reason: `Vehicle permit expired on ${permit.validTo || 'earlier date'}`,
      };
    }

    if (permit && permit.status === 'active') {
      const permitStatus = permit.ownerType === 'student' ? 'authorized_student' : 'authorized_staff';
      const isExempt = ['staff', 'security', 'vip'].includes(permit.ownerType || '');
      const currentCapacity = this.parkingIndexer.getLotCapacity(facilityId);

      // Block entry if facility is at full parking capacity and vehicle is not exempt staff/security/VIP
      if (direction === 'entry' && currentCapacity.availableSpots <= 0 && !isExempt) {
        return {
          plateNumber: normalizedPlate,
          isAuthorized: false,
          isBlacklisted: false,
          gateActuated: false,
          permitStatus,
          reason: `Parking facility ${facilityId} is at maximum capacity (${currentCapacity.occupiedSpots}/${currentCapacity.totalSpots} spots occupied)`,
          parkingCapacity: currentCapacity,
        };
      }

      const delta = direction === 'entry' ? 1 : -1;
      const parkingCapacity = this.parkingIndexer.updateOccupancy(facilityId, delta);

      return {
        plateNumber: normalizedPlate,
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
      plateNumber: normalizedPlate,
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
