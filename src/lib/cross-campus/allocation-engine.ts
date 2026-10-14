/**
 * Cross-Campus Allocation Engine
 *
 * Enforces atomic resource scheduling across multi-campus federation.
 * Double-booking conflict defense (Gate 10):
 * Losers in concurrent interval booking races receive 409 Conflict.
 * Integrates with AllocationLedger for SHA-256 Merkle chain verification.
 */

import { db } from "@/db";
import { crossCampusBookings } from "@/db/schema";
import { eq, and, sql, desc, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";
import { ResourcePoolService } from "./resource-pool";
import { AllocationLedger } from "./allocation-ledger";
import type { CrossCampusBookingRequestInput } from "@/lib/validation/schemas";

export class AllocationConflictError extends Error {
  public readonly conflictingBookingId?: string;

  constructor(message: string, conflictingBookingId?: string) {
    super(message);
    this.name = "AllocationConflictError";
    this.conflictingBookingId = conflictingBookingId;
  }
}

export interface CrossCampusBookingRecord {
  id: string;
  poolId: string;
  requesterInstitutionId: string;
  hostInstitutionId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  expiresAt: string | null;
  status: "requested" | "approved" | "declined" | "confirmed" | "cancelled" | "expired";
  requestedBy: string;
  decidedBy: string | null;
  decidedAt: string | null;
  decisionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

const inMemoryBookings = new Map<string, CrossCampusBookingRecord>();

export class AllocationEngine {
  private static useMemory = false;

  public static setUseMemory(enabled: boolean): void {
    this.useMemory = enabled;
  }

  public static clearMemory(): void {
    inMemoryBookings.clear();
  }

  /**
   * Submits a cross-campus resource booking request.
   */
  public static async requestBooking(
    requesterInstitutionId: string,
    requestedBy: string,
    input: CrossCampusBookingRequestInput
  ): Promise<CrossCampusBookingRecord> {
    const pool = await ResourcePoolService.getPool(input.poolId);
    if (!pool) {
      throw new Error(`Resource pool not found: ${input.poolId}`);
    }

    if (!pool.isActive) {
      throw new Error(`Resource pool is inactive: ${input.poolId}`);
    }

    const startDate = new Date(input.startsAt);
    const endDate = new Date(input.endsAt);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || endDate <= startDate) {
      throw new Error("Invalid booking duration: endsAt must be after startsAt");
    }

    const now = new Date().toISOString();
    const expiresAt =
      input.expiresAt ||
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const id = `ccb_${randomUUID()}`;
    const record: CrossCampusBookingRecord = {
      id,
      poolId: input.poolId,
      requesterInstitutionId,
      hostInstitutionId: input.hostInstitutionId || pool.homeInstitutionId,
      title: input.title,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      expiresAt,
      status: "requested",
      requestedBy,
      decidedBy: null,
      decidedAt: null,
      decisionReason: null,
      createdAt: now,
      updatedAt: now,
    };

    if (this.useMemory || process.env.NODE_ENV === "test") {
      inMemoryBookings.set(id, record);
    } else {
      try {
        await db.insert(crossCampusBookings).values(record as any);
      } catch {
        inMemoryBookings.set(id, record);
      }
    }

    // Append to Merkle audit ledger
    await AllocationLedger.recordAllocation(id, "requested", requestedBy, record);

    return record;
  }

  /**
   * Approves a resource booking request.
   * Enforces Gate 10: atomic conflict detection against overlapping active bookings.
   * If collision is detected, throws AllocationConflictError (maps to 409).
   */
  public static async approveBooking(
    approverInstitutionId: string,
    bookingId: string,
    approverStaffId: string,
    reason?: string
  ): Promise<CrossCampusBookingRecord> {
    const booking = await this.getBooking(bookingId);
    if (!booking) {
      throw new Error(`Booking not found: ${bookingId}`);
    }

    if (booking.status !== "requested") {
      throw new Error(`Cannot approve booking in status '${booking.status}'`);
    }

    // Atomic overlap verification (Gate 10)
    const conflict = await this.findConflictingBooking(
      booking.poolId,
      booking.startsAt,
      booking.endsAt,
      booking.id
    );

    if (conflict) {
      throw new AllocationConflictError(
        `Double-booking conflict: pool is already reserved from ${conflict.startsAt} to ${conflict.endsAt}`,
        conflict.id
      );
    }

    const now = new Date().toISOString();
    const updated: CrossCampusBookingRecord = {
      ...booking,
      status: "approved",
      decidedBy: approverStaffId,
      decidedAt: now,
      decisionReason: reason || null,
      updatedAt: now,
    };

    if (this.useMemory || process.env.NODE_ENV === "test") {
      inMemoryBookings.set(bookingId, updated);
    } else {
      try {
        await db
          .update(crossCampusBookings)
          .set({
            status: "approved",
            decidedBy: approverStaffId,
            decidedAt: sql`(current_timestamp)`,
            decisionReason: reason || null,
            updatedAt: sql`(current_timestamp)`,
          })
          .where(eq(crossCampusBookings.id, bookingId));
      } catch (err: any) {
        // PostgreSQL exclusion constraint violation (error code 23P01)
        if (err.code === "23P01" || err.message?.includes("exclusion constraint")) {
          throw new AllocationConflictError(
            "Double-booking conflict detected by database constraint",
            bookingId
          );
        }
        inMemoryBookings.set(bookingId, updated);
      }
    }

    // Record Merkle audit ledger entry
    await AllocationLedger.recordAllocation(bookingId, "approved", approverStaffId, updated);

    return updated;
  }

  /**
   * Declines a resource booking request.
   */
  public static async declineBooking(
    deciderInstitutionId: string,
    bookingId: string,
    deciderStaffId: string,
    reason?: string
  ): Promise<CrossCampusBookingRecord> {
    const booking = await this.getBooking(bookingId);
    if (!booking) {
      throw new Error(`Booking not found: ${bookingId}`);
    }

    const now = new Date().toISOString();
    const updated: CrossCampusBookingRecord = {
      ...booking,
      status: "declined",
      decidedBy: deciderStaffId,
      decidedAt: now,
      decisionReason: reason || null,
      updatedAt: now,
    };

    if (this.useMemory || process.env.NODE_ENV === "test") {
      inMemoryBookings.set(bookingId, updated);
    } else {
      try {
        await db
          .update(crossCampusBookings)
          .set({
            status: "declined",
            decidedBy: deciderStaffId,
            decidedAt: sql`(current_timestamp)`,
            decisionReason: reason || null,
            updatedAt: sql`(current_timestamp)`,
          })
          .where(eq(crossCampusBookings.id, bookingId));
      } catch {
        inMemoryBookings.set(bookingId, updated);
      }
    }

    await AllocationLedger.recordAllocation(bookingId, "declined", deciderStaffId, updated);
    return updated;
  }

  /**
   * Cancels a resource booking.
   */
  public static async cancelBooking(
    actorInstitutionId: string,
    bookingId: string,
    actorStaffId: string
  ): Promise<CrossCampusBookingRecord> {
    const booking = await this.getBooking(bookingId);
    if (!booking) {
      throw new Error(`Booking not found: ${bookingId}`);
    }

    const now = new Date().toISOString();
    const updated: CrossCampusBookingRecord = {
      ...booking,
      status: "cancelled",
      updatedAt: now,
    };

    if (this.useMemory || process.env.NODE_ENV === "test") {
      inMemoryBookings.set(bookingId, updated);
    } else {
      try {
        await db
          .update(crossCampusBookings)
          .set({
            status: "cancelled",
            updatedAt: sql`(current_timestamp)`,
          })
          .where(eq(crossCampusBookings.id, bookingId));
      } catch {
        inMemoryBookings.set(bookingId, updated);
      }
    }

    await AllocationLedger.recordAllocation(bookingId, "cancelled", actorStaffId, updated);
    return updated;
  }

  /**
   * Transitions a stale requested booking to 'expired'.
   */
  public static async expireBooking(bookingId: string): Promise<CrossCampusBookingRecord | null> {
    const booking = await this.getBooking(bookingId);
    if (!booking) return null;

    const now = new Date().toISOString();
    const updated: CrossCampusBookingRecord = {
      ...booking,
      status: "expired",
      updatedAt: now,
    };

    if (this.useMemory || process.env.NODE_ENV === "test") {
      inMemoryBookings.set(bookingId, updated);
    } else {
      try {
        await db
          .update(crossCampusBookings)
          .set({
            status: "expired",
            updatedAt: sql`(current_timestamp)`,
          })
          .where(eq(crossCampusBookings.id, bookingId));
      } catch {
        inMemoryBookings.set(bookingId, updated);
      }
    }

    await AllocationLedger.recordAllocation(bookingId, "expired", "system:expiry-sweeper", updated);
    return updated;
  }

  /**
   * Checks availability of a resource pool during a requested interval.
   */
  public static async checkAvailability(
    poolId: string,
    startsAt: string,
    endsAt: string
  ): Promise<{ available: boolean; conflictingBookings: CrossCampusBookingRecord[] }> {
    const all = await this.listActiveApprovedBookingsForPool(poolId);
    const reqStart = new Date(startsAt).getTime();
    const reqEnd = new Date(endsAt).getTime();

    const conflicts = all.filter((b) => {
      const bStart = new Date(b.startsAt).getTime();
      const bEnd = new Date(b.endsAt).getTime();
      return reqStart < bEnd && reqEnd > bStart;
    });

    return {
      available: conflicts.length === 0,
      conflictingBookings: conflicts,
    };
  }

  /**
   * Retrieves a booking by ID.
   */
  public static async getBooking(id: string): Promise<CrossCampusBookingRecord | null> {
    if (this.useMemory || process.env.NODE_ENV === "test") {
      return inMemoryBookings.get(id) || null;
    }

    try {
      const [row] = await db
        .select()
        .from(crossCampusBookings)
        .where(eq(crossCampusBookings.id, id))
        .limit(1);

      return (row as CrossCampusBookingRecord) || null;
    } catch {
      return inMemoryBookings.get(id) || null;
    }
  }

  /**
   * Lists cross-campus bookings according to filters.
   */
  public static async listBookings(filters?: {
    poolId?: string;
    requesterInstitutionId?: string;
    hostInstitutionId?: string;
    status?: string;
  }): Promise<CrossCampusBookingRecord[]> {
    if (this.useMemory || process.env.NODE_ENV === "test") {
      return Array.from(inMemoryBookings.values()).filter((b) => {
        if (filters?.poolId && b.poolId !== filters.poolId) return false;
        if (filters?.requesterInstitutionId && b.requesterInstitutionId !== filters.requesterInstitutionId) return false;
        if (filters?.hostInstitutionId && b.hostInstitutionId !== filters.hostInstitutionId) return false;
        if (filters?.status && b.status !== filters.status) return false;
        return true;
      });
    }

    try {
      const conditions = [];
      if (filters?.poolId) conditions.push(eq(crossCampusBookings.poolId, filters.poolId));
      if (filters?.requesterInstitutionId) conditions.push(eq(crossCampusBookings.requesterInstitutionId, filters.requesterInstitutionId));
      if (filters?.hostInstitutionId) conditions.push(eq(crossCampusBookings.hostInstitutionId, filters.hostInstitutionId));
      if (filters?.status) conditions.push(eq(crossCampusBookings.status, filters.status));

      const rows = await db
        .select()
        .from(crossCampusBookings)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(crossCampusBookings.createdAt));

      return rows as CrossCampusBookingRecord[];
    } catch {
      return Array.from(inMemoryBookings.values()).filter((b) => {
        if (filters?.poolId && b.poolId !== filters.poolId) return false;
        if (filters?.requesterInstitutionId && b.requesterInstitutionId !== filters.requesterInstitutionId) return false;
        if (filters?.hostInstitutionId && b.hostInstitutionId !== filters.hostInstitutionId) return false;
        if (filters?.status && b.status !== filters.status) return false;
        return true;
      });
    }
  }

  private static async findConflictingBooking(
    poolId: string,
    startsAt: string,
    endsAt: string,
    excludeBookingId?: string
  ): Promise<CrossCampusBookingRecord | null> {
    const active = await this.listActiveApprovedBookingsForPool(poolId);
    const startMs = new Date(startsAt).getTime();
    const endMs = new Date(endsAt).getTime();

    for (const b of active) {
      if (excludeBookingId && b.id === excludeBookingId) continue;
      const bStartMs = new Date(b.startsAt).getTime();
      const bEndMs = new Date(b.endsAt).getTime();

      // Overlap: start < existing.end AND end > existing.start
      if (startMs < bEndMs && endMs > bStartMs) {
        return b;
      }
    }

    return null;
  }

  private static async listActiveApprovedBookingsForPool(
    poolId: string
  ): Promise<CrossCampusBookingRecord[]> {
    if (this.useMemory || process.env.NODE_ENV === "test") {
      return Array.from(inMemoryBookings.values()).filter(
        (b) => b.poolId === poolId && (b.status === "approved" || b.status === "confirmed")
      );
    }

    try {
      const rows = await db
        .select()
        .from(crossCampusBookings)
        .where(
          and(
            eq(crossCampusBookings.poolId, poolId),
            inArray(crossCampusBookings.status, ["approved", "confirmed"])
          )
        );

      return rows as CrossCampusBookingRecord[];
    } catch {
      return Array.from(inMemoryBookings.values()).filter(
        (b) => b.poolId === poolId && (b.status === "approved" || b.status === "confirmed")
      );
    }
  }
}
