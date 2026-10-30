/**
 * Apple WWDC Fluid Interface Sheet Physics
 * Core mathematical models for momentum projection, rubber-banding, and velocity handoff.
 */

/**
 * Projects resting position from release velocity using exponential decay deceleration.
 * Apple "Designing Fluid Interfaces" WWDC 2018 canonical formula.
 *
 * @param releaseVelocity - Initial gesture velocity in pixels/second (px/s)
 * @param decelerationRate - Decay coefficient (~0.998 standard fluid scroll; ~0.99 snappier)
 * @returns Projected travel distance in pixels
 */
export function projectMomentum(
  releaseVelocity: number,
  decelerationRate = 0.998
): number {
  if (releaseVelocity === 0) return 0;
  return (releaseVelocity / 1000) * decelerationRate / (1 - decelerationRate);
}

/**
 * Computes progressive rubber-band resistance when dragged past physical bounds.
 *
 * @param overshoot - Distance pulled beyond the edge in pixels
 * @param dimension - Reference viewport or sheet dimension in pixels
 * @param constant - Apple resistance factor (default 0.55)
 * @returns Damped displacement value
 */
export function calculateRubberBand(
  overshoot: number,
  dimension: number,
  constant = 0.55
): number {
  if (overshoot === 0 || dimension <= 0) return 0;
  return (
    (overshoot * dimension * constant) /
    (dimension + constant * Math.abs(overshoot))
  );
}

/**
 * Finds the nearest target snap point based on current position and projected velocity.
 *
 * @param projectedEndpoint - Current position + projected momentum distance
 * @param snapPoints - Array of target pixel offsets or fractional values
 * @returns Closest target snap point
 */
export function resolveNearestSnapPoint(
  projectedEndpoint: number,
  snapPoints: number[]
): number {
  if (snapPoints.length === 0) return 0;
  return snapPoints.reduce((prev, curr) =>
    Math.abs(curr - projectedEndpoint) < Math.abs(prev - projectedEndpoint)
      ? curr
      : prev
  );
}

/**
 * Decides whether a sheet should dismiss based on projected displacement or velocity flick.
 *
 * @param currentOffset - Current drag displacement from top/rest (px)
 * @param velocity - Release velocity in px/s (positive downward)
 * @param dismissThreshold - Threshold displacement at which sheet dismisses (px)
 * @param velocityThreshold - Minimum velocity flick in px/s that forces dismissal (default 500)
 */
export function shouldDismissSheet(
  currentOffset: number,
  velocity: number,
  dismissThreshold: number,
  velocityThreshold = 500
): boolean {
  if (velocity > velocityThreshold) return true;
  if (velocity < -velocityThreshold) return false;
  const projected = currentOffset + projectMomentum(velocity);
  return projected >= dismissThreshold;
}
