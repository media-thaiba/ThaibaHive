import { ResourceReservation } from './mesh-types';

export interface CrdtElement<T> {
  element: T;
  tag: string; // Unique tag
  lamportTime: number;
  nodeId: string;
}

/**
 * Observed-Remove Set (ORSet) CRDT for Distributed Cross-Campus Reservations
 * Guarantees eventual consistency and collision-free merging across network partitions.
 */
export class ResourceCrdtSync {
  private addSet: Map<string, CrdtElement<ResourceReservation>> = new Map();
  private removeSet: Set<string> = new Set();
  private nodeId: string;
  private currentLamport = 0;

  constructor(nodeId: string) {
    this.nodeId = nodeId;
  }

  public addReservation(reservation: ResourceReservation): void {
    this.currentLamport++;
    const tag = `${reservation.reservationId}_${this.nodeId}_${this.currentLamport}`;
    this.addSet.set(tag, {
      element: { ...reservation, lamportTimestamp: this.currentLamport },
      tag,
      lamportTime: this.currentLamport,
      nodeId: this.nodeId,
    });
  }

  public cancelReservation(reservationId: string): void {
    for (const [tag, item] of this.addSet.entries()) {
      if (item.element.reservationId === reservationId) {
        this.removeSet.add(tag);
      }
    }
  }

  /**
   * Merges remote CRDT state into local state (Lattice join)
   */
  public merge(remoteSync: ResourceCrdtSync): void {
    // 1. Union of remove sets
    for (const tag of remoteSync.removeSet) {
      this.removeSet.add(tag);
    }

    // 2. Union of add sets
    for (const [tag, item] of remoteSync.addSet.entries()) {
      if (!this.addSet.has(tag)) {
        this.addSet.set(tag, item);
      }
      this.currentLamport = Math.max(this.currentLamport, item.lamportTime);
    }
  }

  /**
   * Returns active non-removed reservations
   */
  public getActiveReservations(): ResourceReservation[] {
    const activeMap = new Map<string, ResourceReservation>();

    for (const [tag, item] of this.addSet.entries()) {
      if (!this.removeSet.has(tag)) {
        activeMap.set(item.element.reservationId, item.element);
      }
    }

    return Array.from(activeMap.values());
  }

  public getNodeId(): string {
    return this.nodeId;
  }
}
