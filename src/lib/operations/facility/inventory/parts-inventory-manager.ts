import { PartReservationRequest, PartReservationResult } from './inventory-types';
import { facilityStore } from '../../../db/facility-store';

export class PartsInventoryManager {
  private static instance: PartsInventoryManager;

  public static getInstance(): PartsInventoryManager {
    if (!PartsInventoryManager.instance) {
      PartsInventoryManager.instance = new PartsInventoryManager();
    }
    return PartsInventoryManager.instance;
  }

  public async reserveParts(
    requests: PartReservationRequest[],
    institutionId: string = 'global'
  ): Promise<{ allReserved: boolean; results: PartReservationResult[] }> {
    const results: PartReservationResult[] = [];
    let allReserved = true;

    for (const req of requests) {
      const part = await facilityStore.getPart(req.partNumber, institutionId);
      if (!part) {
        allReserved = false;
        results.push({
          success: false,
          partNumber: req.partNumber,
          quantityReserved: 0,
          availableStockRemaining: 0,
          stockout: true,
          message: `Part '${req.partNumber}' not found in inventory catalog`,
        });
        continue;
      }

      const available = part.quantityOnHand - part.quantityReserved;
      if (available >= req.quantity) {
        await facilityStore.reservePart(req.partNumber, req.quantity, institutionId);
        results.push({
          success: true,
          partNumber: req.partNumber,
          quantityReserved: req.quantity,
          availableStockRemaining: available - req.quantity,
          stockout: false,
          message: `Successfully reserved ${req.quantity} unit(s) of '${part.name}'`,
        });
      } else {
        allReserved = false;
        results.push({
          success: false,
          partNumber: req.partNumber,
          quantityReserved: 0,
          availableStockRemaining: available,
          stockout: true,
          message: `Insufficient inventory: requested ${req.quantity}, but only ${available} available`,
        });
      }
    }

    return { allReserved, results };
  }
}

export const partsInventoryManager = PartsInventoryManager.getInstance();
