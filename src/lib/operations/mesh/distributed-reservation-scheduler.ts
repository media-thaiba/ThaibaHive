import { ResourceReservation } from './mesh-types';
import { ResourceCrdtSync } from './resource-crdt-sync';

/**
 * Distributed Multi-Campus Reservation Scheduler
 * Orchestrates multi-node CRDT state synchronization and reservation reconciliation.
 */
export class DistributedReservationScheduler {
  private localCrdt: ResourceCrdtSync;
  private peerCrdts: Map<string, ResourceCrdtSync> = new Map();

  constructor(localCampusId: string) {
    this.localCrdt = new ResourceCrdtSync(localCampusId);
  }

  public registerPeerNode(campusId: string): ResourceCrdtSync {
    if (!this.peerCrdts.has(campusId)) {
      this.peerCrdts.set(campusId, new ResourceCrdtSync(campusId));
    }
    return this.peerCrdts.get(campusId)!;
  }

  public scheduleReservation(reservation: ResourceReservation): void {
    this.localCrdt.addReservation(reservation);
  }

  /**
   * Broadcasts and merges CRDT state across all registered campus peer nodes
   */
  public synchronizeAcrossCampuses(): {
    activeReservationsCount: number;
    syncedNodeCount: number;
  } {
    for (const peer of this.peerCrdts.values()) {
      this.localCrdt.merge(peer);
      peer.merge(this.localCrdt);
    }

    return {
      activeReservationsCount: this.localCrdt.getActiveReservations().length,
      syncedNodeCount: this.peerCrdts.size + 1,
    };
  }

  public getReservations(): ResourceReservation[] {
    return this.localCrdt.getActiveReservations();
  }
}
