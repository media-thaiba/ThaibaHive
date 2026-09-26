import { CampusResource, ResourceReservation } from './mesh-types';

/**
 * Cross-Campus Resource Broker
 * Manages shared physical and digital institutional asset catalogs across campuses.
 */
export class CampusResourceBroker {
  private resources: Map<string, CampusResource> = new Map();

  public registerResource(resource: CampusResource): void {
    this.resources.set(resource.resourceId, resource);
  }

  public getResource(resourceId: string): CampusResource | undefined {
    return this.resources.get(resourceId);
  }

  public getShareableResources(requestingCampusId?: string): CampusResource[] {
    const list = Array.from(this.resources.values()).filter((r) => r.isShareableCrossCampus);
    if (requestingCampusId) {
      return list;
    }
    return list;
  }

  /**
   * Attempts to book a resource for a specified time window
   */
  public bookResource(reservation: ResourceReservation): {
    success: boolean;
    reservation?: ResourceReservation;
    reason?: string;
  } {
    const resource = this.resources.get(reservation.resourceId);
    if (!resource) {
      return { success: false, reason: 'Resource not found' };
    }

    // Overlap check
    const newStart = new Date(reservation.startTimeIso).getTime();
    const newEnd = new Date(reservation.endTimeIso).getTime();

    const hasCollision = resource.activeReservations.some((res) => {
      if (res.status === 'CANCELLED') return false;
      const resStart = new Date(res.startTimeIso).getTime();
      const resEnd = new Date(res.endTimeIso).getTime();
      return (newStart < resEnd && newEnd > resStart);
    });

    if (hasCollision) {
      return { success: false, reason: 'Time slot collision with existing reservation' };
    }

    const confirmed: ResourceReservation = {
      ...reservation,
      status: 'CONFIRMED',
    };

    resource.activeReservations.push(confirmed);
    return { success: true, reservation: confirmed };
  }
}
