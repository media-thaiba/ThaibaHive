import { db } from "@/db";
import { bookings } from "@/db/schema";
import { and, eq, gt, inArray, lt, ne } from "drizzle-orm";

/**
 * In-memory serialization mutex keyed by resourceId.
 * Guarantees that concurrent slot availability checks and inserts/approvals
 * on the exact same resource execute strictly sequentially.
 */
const resourceLocks = new Map<string, Promise<void>>();

export async function withBookingLock<T>(resourceId: string, fn: () => Promise<T>): Promise<T> {
  const currentLock = resourceLocks.get(resourceId) ?? Promise.resolve();
  let release: () => void = () => {};
  const nextLock = new Promise<void>((resolve) => {
    release = resolve;
  });

  resourceLocks.set(resourceId, currentLock.then(() => nextLock));

  try {
    await currentLock;
    return await fn();
  } finally {
    release();
    if (resourceLocks.get(resourceId) === nextLock) {
      resourceLocks.delete(resourceId);
    }
  }
}

/**
 * Checks whether an active booking (pending, confirmed, or approved)
 * overlaps with the requested [startTime, endTime] interval on the given resource.
 * Slots touching at exact boundaries (startTime === prev.endTime) do NOT overlap.
 */
export async function hasOverlappingBooking(
  resourceId: string,
  startTime: string,
  endTime: string,
  excludeBookingId?: string,
  statuses: string[] = ["pending", "confirmed", "approved"]
): Promise<boolean> {
  const conditions = [
    eq(bookings.resourceId, resourceId),
    inArray(bookings.status, statuses),
    lt(bookings.startTime, endTime),
    gt(bookings.endTime, startTime),
  ];

  if (excludeBookingId) {
    conditions.push(ne(bookings.id, excludeBookingId));
  }

  const existing = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(and(...conditions))
    .get();

  return Boolean(existing);
}

const MAX_BOOKING_DURATION_MS = 14 * 24 * 60 * 60 * 1000; // 14 days max
const CLOCK_DRIFT_TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes past drift tolerance

export function validateBookingTimes(
  startTime: string,
  endTime: string,
  options?: { allowPast?: boolean }
): { valid: boolean; error?: string } {
  const start = Date.parse(startTime);
  const end = Date.parse(endTime);

  if (Number.isNaN(start) || Number.isNaN(end)) {
    return { valid: false, error: "Invalid datetime format for booking start or end time" };
  }

  if (end <= start) {
    return { valid: false, error: "Booking end time must be after start time" };
  }

  if (!options?.allowPast) {
    const minAllowed = Date.now() - CLOCK_DRIFT_TOLERANCE_MS;
    if (start < minAllowed) {
      return { valid: false, error: "Cannot create booking for a time slot in the past" };
    }
  }

  const duration = end - start;
  if (duration > MAX_BOOKING_DURATION_MS) {
    return { valid: false, error: "Booking duration cannot exceed 14 consecutive days" };
  }

  return { valid: true };
}
