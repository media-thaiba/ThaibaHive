/**
 * Cross-Campus Expiry Sweeper
 *
 * Scans for stale resource booking requests that have passed their expiration timestamp (expiresAt)
 * without an approval or decline decision.
 * Transitions status to 'expired' and appends an immutable entry to the AllocationLedger (Gate 19).
 */

import { AllocationEngine } from "./allocation-engine";

export class ExpirySweeper {
  /**
   * Sweeps all pending requests that have passed expiresAt.
   * Returns the count of bookings expired.
   */
  public static async sweepExpiredRequests(): Promise<number> {
    const requested = await AllocationEngine.listBookings({ status: "requested" });
    const now = Date.now();
    let expiredCount = 0;

    for (const booking of requested) {
      if (!booking.expiresAt) continue;

      const expiryTime = new Date(booking.expiresAt).getTime();
      if (!isNaN(expiryTime) && expiryTime <= now) {
        await AllocationEngine.expireBooking(booking.id);
        expiredCount++;
      }
    }

    return expiredCount;
  }
}
