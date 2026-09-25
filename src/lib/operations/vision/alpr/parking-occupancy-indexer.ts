export interface ParkingLotCapacity {
  facilityId: string;
  totalSpots: number;
  occupiedSpots: number;
  availableSpots: number;
  occupancyRatePercent: number;
}

export class ParkingOccupancyIndexer {
  private lots: Map<string, { totalSpots: number; occupied: number }> = new Map();

  public registerLot(facilityId: string, totalSpots: number): void {
    this.lots.set(facilityId, { totalSpots, occupied: 0 });
  }

  public updateOccupancy(facilityId: string, delta: number): ParkingLotCapacity {
    let lot = this.lots.get(facilityId);
    if (!lot) {
      lot = { totalSpots: 100, occupied: 0 };
      this.lots.set(facilityId, lot);
    }

    lot.occupied = Math.max(0, Math.min(lot.totalSpots, lot.occupied + delta));
    const available = Math.max(0, lot.totalSpots - lot.occupied);
    const rate = Number(((lot.occupied / lot.totalSpots) * 100).toFixed(1));

    return {
      facilityId,
      totalSpots: lot.totalSpots,
      occupiedSpots: lot.occupied,
      availableSpots: available,
      occupancyRatePercent: rate,
    };
  }

  public getLotCapacity(facilityId: string): ParkingLotCapacity {
    const lot = this.lots.get(facilityId) || { totalSpots: 100, occupied: 0 };
    return {
      facilityId,
      totalSpots: lot.totalSpots,
      occupiedSpots: lot.occupied,
      availableSpots: Math.max(0, lot.totalSpots - lot.occupied),
      occupancyRatePercent: Number(((lot.occupied / lot.totalSpots) * 100).toFixed(1)),
    };
  }
}
