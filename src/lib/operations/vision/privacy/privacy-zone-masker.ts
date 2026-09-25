export interface PrivacyMaskZone {
  zoneId: string;
  cameraId: string;
  polygon: { x: number; y: number }[];
  description: string; // e.g. "Dormitory Window Area", "Restroom Doorway"
}

export class PrivacyZoneMasker {
  private masks: Map<string, PrivacyMaskZone[]> = new Map();

  public registerMask(mask: PrivacyMaskZone): void {
    const list = this.masks.get(mask.cameraId) || [];
    list.push(mask);
    this.masks.set(mask.cameraId, list);
  }

  public getMasksForCamera(cameraId: string): PrivacyMaskZone[] {
    return this.masks.get(cameraId) || [];
  }

  public isPointInMaskedZone(cameraId: string, point: { x: number; y: number }): boolean {
    const list = this.masks.get(cameraId);
    if (!list) return false;

    for (const mask of list) {
      if (this.isPointInsidePolygon(point, mask.polygon)) {
        return true;
      }
    }
    return false;
  }

  private isPointInsidePolygon(point: { x: number; y: number }, polygon: { x: number; y: number }[]): boolean {
    if (polygon.length < 3) return false;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;
      const intersect = ((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }
}
