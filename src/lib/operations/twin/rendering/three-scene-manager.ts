import { Point3D, BoundingBox3D } from '../twin-types';
import { ParsedFacilityScene, ParsedSpaceModel } from './model-parser';

export interface CameraState {
  position: Point3D;
  target: Point3D;
  zoom: number;
}

export interface RaycastHitResult {
  hit: boolean;
  spaceId?: string;
  spaceName?: string;
  distance: number;
  intersectionPoint?: Point3D;
}

export class ThreeSceneManager {
  private facilityScene: ParsedFacilityScene | null = null;
  private camera: CameraState = {
    position: { x: 50, y: -100, z: 80 },
    target: { x: 50, y: 50, z: 10 },
    zoom: 1.0,
  };
  private isolatedFloorLevel: number | null = null;
  private explodedViewDistance: number = 0; // 0 = standard, > 0 = floors lifted up
  private selectedSpaceId: string | null = null;
  private activeLodLevel: number = 1; // 0: full, 1: standard, 2: box
  private targetFps: number = 60;

  public loadFacilityScene(scene: ParsedFacilityScene): void {
    this.facilityScene = scene;
    const center = {
      x: (scene.sceneBounds.min.x + scene.sceneBounds.max.x) / 2,
      y: (scene.sceneBounds.min.y + scene.sceneBounds.max.y) / 2,
      z: (scene.sceneBounds.min.z + scene.sceneBounds.max.z) / 2,
    };
    this.camera.target = center;
    this.camera.position = {
      x: center.x,
      y: center.y - (scene.sceneBounds.max.y - scene.sceneBounds.min.y) * 1.5,
      z: center.z + (scene.sceneBounds.max.z - scene.sceneBounds.min.z) * 2.0 + 20,
    };
  }

  public getScene(): ParsedFacilityScene | null {
    return this.facilityScene;
  }

  public getCameraState(): CameraState {
    return { ...this.camera };
  }

  public setCameraState(camera: Partial<CameraState>): void {
    this.camera = { ...this.camera, ...camera };
  }

  public setIsolatedFloor(floorLevel: number | null): void {
    this.isolatedFloorLevel = floorLevel;
  }

  public getIsolatedFloor(): number | null {
    return this.isolatedFloorLevel;
  }

  public setExplodedViewDistance(distanceMeters: number): void {
    this.explodedViewDistance = Math.max(0, distanceMeters);
  }

  public getExplodedViewDistance(): number {
    return this.explodedViewDistance;
  }

  public setSelectedSpace(spaceId: string | null): void {
    this.selectedSpaceId = spaceId;
  }

  public getSelectedSpace(): string | null {
    return this.selectedSpaceId;
  }

  public setLodLevel(lod: number): void {
    this.activeLodLevel = Math.max(0, Math.min(2, lod));
  }

  public getLodLevel(): number {
    return this.activeLodLevel;
  }

  public getRenderableSpaces(): Array<ParsedSpaceModel & { transformedZ: number }> {
    if (!this.facilityScene) return [];

    return this.facilityScene.spaces
      .filter((space) => {
        if (this.isolatedFloorLevel !== null) {
          return space.floorLevel === this.isolatedFloorLevel;
        }
        return true;
      })
      .map((space) => {
        const floorOffset = space.floorLevel * this.explodedViewDistance;
        return {
          ...space,
          transformedZ: space.boundingBox.min.z + floorOffset,
        };
      });
  }

  /**
   * Raycast selection simulation: ray from origin through direction
   */
  public raycast(rayOrigin: Point3D, rayDirection: Point3D): RaycastHitResult {
    const spaces = this.getRenderableSpaces();
    let closestHit: RaycastHitResult = { hit: false, distance: Infinity };

    for (const space of spaces) {
      const bMin = { ...space.boundingBox.min, z: space.transformedZ };
      const bMax = { ...space.boundingBox.max, z: space.transformedZ + (space.boundingBox.max.z - space.boundingBox.min.z) };

      // Ray-AABB intersection test
      const t = this.intersectRayAabb(rayOrigin, rayDirection, bMin, bMax);
      if (t !== null && t < closestHit.distance && t > 0) {
        closestHit = {
          hit: true,
          spaceId: space.spaceId,
          spaceName: space.name,
          distance: t,
          intersectionPoint: {
            x: rayOrigin.x + rayDirection.x * t,
            y: rayOrigin.y + rayDirection.y * t,
            z: rayOrigin.z + rayDirection.z * t,
          },
        };
      }
    }

    return closestHit;
  }

  private intersectRayAabb(
    origin: Point3D,
    dir: Point3D,
    boxMin: Point3D,
    boxMax: Point3D
  ): number | null {
    let tmin = (boxMin.x - origin.x) / (dir.x || 0.00001);
    let tmax = (boxMax.x - origin.x) / (dir.x || 0.00001);
    if (tmin > tmax) [tmin, tmax] = [tmax, tmin];

    let tymin = (boxMin.y - origin.y) / (dir.y || 0.00001);
    let tymax = (boxMax.y - origin.y) / (dir.y || 0.00001);
    if (tymin > tymax) [tymin, tymax] = [tymax, tymin];

    if (tmin > tymax || tymin > tmax) return null;
    if (tymin > tmin) tmin = tymin;
    if (tymax < tmax) tmax = tymax;

    let tzmin = (boxMin.z - origin.z) / (dir.z || 0.00001);
    let tzmax = (boxMax.z - origin.z) / (dir.z || 0.00001);
    if (tzmin > tzmax) [tzmin, tzmax] = [tzmax, tzmin];

    if (tmin > tzmax || tzmin > tmax) return null;
    if (tzmin > tmin) tmin = tzmin;

    return tmin > 0 ? tmin : null;
  }

  public getRenderingFps(): number {
    return this.targetFps;
  }
}
