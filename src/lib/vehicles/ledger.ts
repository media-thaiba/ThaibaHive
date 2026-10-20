/**
 * Fleet & Vehicle Logistics Management Ledger & Concurrency Engine
 *
 * Implements:
 * 1. Serialized per-vehicle mutex (withVehicleLock) preventing double-booking races.
 * 2. Overlap calculation for temporal vehicle scheduling.
 * 3. Multi-tenant scoping and fail-closed authorization helpers.
 * 4. Terminal state immutability checking.
 */

const vehicleLocks = new Map<string, Promise<unknown>>();

/**
 * Serializes operations on a specific vehicle to prevent concurrent booking collisions
 * and racing status mutations.
 */
export async function withVehicleLock<T>(vehicleId: string, fn: () => Promise<T>): Promise<T> {
  const currentLock = vehicleLocks.get(vehicleId) ?? Promise.resolve();
  let release: () => void;
  const nextLock = new Promise<void>((resolve) => {
    release = resolve;
  });

  vehicleLocks.set(vehicleId, currentLock.then(() => nextLock));

  try {
    await currentLock;
    return await fn();
  } finally {
    release!();
    if (vehicleLocks.get(vehicleId) === nextLock) {
      vehicleLocks.delete(vehicleId);
    }
  }
}

/**
 * Parses "HH:mm" time strings into minutes from midnight.
 */
export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(":");
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  return hours * 60 + minutes;
}

/**
 * Evaluates whether two time ranges overlap on the same date.
 * If end time is omitted, defaults to a 2-hour window.
 */
export function isTimeOverlapping(
  startA: string,
  endA: string | null | undefined,
  startB: string,
  endB: string | null | undefined
): boolean {
  const aStartMinutes = parseTimeToMinutes(startA);
  const aEndMinutes = endA ? parseTimeToMinutes(endA) : aStartMinutes + 120;
  const bStartMinutes = parseTimeToMinutes(startB);
  const bEndMinutes = endB ? parseTimeToMinutes(endB) : bStartMinutes + 120;

  return Math.max(aStartMinutes, bStartMinutes) < Math.min(aEndMinutes, bEndMinutes);
}

export interface VehicleSessionContext {
  role?: string;
  staffId?: string | null;
  institutionId?: string | null;
  sub?: string;
}

/**
 * Verifies if the session user is authorized to view or access a vehicle.
 */
export function canAccessVehicle(
  vehicle: { institutionId: string | null },
  session: VehicleSessionContext,
  scopedInstId: string
): boolean {
  if (session.role === "super_admin") return true;
  if (scopedInstId === "global") return true;
  if (!vehicle.institutionId) return true;
  return vehicle.institutionId === scopedInstId;
}

/**
 * Verifies if the session user is authorized to view a vehicle booking.
 */
export function canAccessVehicleBooking(
  booking: { bookedById: string },
  vehicle: { institutionId: string | null },
  session: VehicleSessionContext,
  scopedInstId: string
): boolean {
  if (session.role === "super_admin") return true;
  if (scopedInstId !== "global" && vehicle.institutionId && vehicle.institutionId !== scopedInstId) {
    return false;
  }
  if (session.role === "admin" || session.role === "principal" || session.role === "hod") {
    return true;
  }
  return Boolean(session.staffId && booking.bookedById === session.staffId);
}

/**
 * Verifies if the session user is authorized to manage/approve/reject a vehicle booking.
 */
export function canManageVehicleBooking(
  vehicle: { institutionId: string | null },
  session: VehicleSessionContext,
  scopedInstId: string
): boolean {
  if (session.role === "super_admin") return true;
  if (scopedInstId !== "global" && vehicle.institutionId && vehicle.institutionId !== scopedInstId) {
    return false;
  }
  return session.role === "admin" || session.role === "principal" || session.role === "hod";
}

/**
 * Checks if a booking status is terminal (cannot be modified or soft-withdrawn further).
 */
export function isTerminalBookingStatus(status: string): boolean {
  return status === "approved" || status === "rejected" || status === "cancelled";
}
