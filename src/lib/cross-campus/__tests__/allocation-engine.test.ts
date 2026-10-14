import { AllocationEngine, AllocationConflictError } from "../allocation-engine";
import { ResourcePoolService } from "../resource-pool";
import { AllocationLedger } from "../allocation-ledger";

describe("Wave 4: AllocationEngine & Concurrency Conflict Defense (Gate 10)", () => {
  const hostInst = "inst_campus_alpha";
  const reqInst = "inst_campus_beta";
  let poolId: string;

  beforeEach(async () => {
    AllocationEngine.setUseMemory(true);
    AllocationEngine.clearMemory();
    ResourcePoolService.setUseMemory(true);
    ResourcePoolService.clearMemory();
    AllocationLedger.setUseMemory(true);
    AllocationLedger.clearMemory();

    const pool = await ResourcePoolService.createPool(hostInst, {
      regionalGroupId: "reg_central",
      resourceType: "hall",
      name: "Main Auditorium",
      capacity: 500,
      isActive: true,
    });
    poolId = pool.id;
  });

  afterEach(() => {
    AllocationEngine.clearMemory();
    ResourcePoolService.clearMemory();
    AllocationLedger.clearMemory();
  });

  it("submits a booking request with status 'requested'", async () => {
    const booking = await AllocationEngine.requestBooking(reqInst, "staff_requester", {
      poolId,
      hostInstitutionId: hostInst,
      title: "Inter-Campus Hackathon",
      startsAt: "2026-11-10T09:00:00Z",
      endsAt: "2026-11-10T17:00:00Z",
    });

    expect(booking).toBeDefined();
    expect(booking.id).toMatch(/^ccb_/);
    expect(booking.status).toBe("requested");
    expect(booking.poolId).toBe(poolId);
  });

  it("enforces Gate 10: rejects overlapping booking approval with AllocationConflictError", async () => {
    // 1. Submit Request A: Nov 10, 09:00 - 13:00
    const bookingA = await AllocationEngine.requestBooking(reqInst, "staff_user1", {
      poolId,
      hostInstitutionId: hostInst,
      title: "Morning Conference",
      startsAt: "2026-11-10T09:00:00Z",
      endsAt: "2026-11-10T13:00:00Z",
    });

    // 2. Submit Request B: Nov 10, 12:00 - 16:00 (overlaps by 1 hour with A)
    const bookingB = await AllocationEngine.requestBooking("inst_campus_gamma", "staff_user2", {
      poolId,
      hostInstitutionId: hostInst,
      title: "Overlapping Seminar",
      startsAt: "2026-11-10T12:00:00Z",
      endsAt: "2026-11-10T16:00:00Z",
    });

    // 3. Approve Request A -> succeeds
    const approvedA = await AllocationEngine.approveBooking(hostInst, bookingA.id, "staff_approver");
    expect(approvedA.status).toBe("approved");

    // 4. Approve Request B -> Gate 10 throws AllocationConflictError!
    await expect(
      AllocationEngine.approveBooking(hostInst, bookingB.id, "staff_approver")
    ).rejects.toThrow(AllocationConflictError);

    // 5. Submit Request C: Nov 10, 14:00 - 18:00 (non-overlapping with A)
    const bookingC = await AllocationEngine.requestBooking("inst_campus_gamma", "staff_user3", {
      poolId,
      hostInstitutionId: hostInst,
      title: "Afternoon Workshop",
      startsAt: "2026-11-10T14:00:00Z",
      endsAt: "2026-11-10T18:00:00Z",
    });

    // Approve Request C -> succeeds
    const approvedC = await AllocationEngine.approveBooking(hostInst, bookingC.id, "staff_approver");
    expect(approvedC.status).toBe("approved");
  });

  it("declines a booking request", async () => {
    const booking = await AllocationEngine.requestBooking(reqInst, "staff_1", {
      poolId,
      hostInstitutionId: hostInst,
      title: "Declined Event",
      startsAt: "2026-11-12T10:00:00Z",
      endsAt: "2026-11-12T12:00:00Z",
    });

    const declined = await AllocationEngine.declineBooking(
      hostInst,
      booking.id,
      "staff_approver",
      "Maintenance scheduled"
    );

    expect(declined.status).toBe("declined");
    expect(declined.decisionReason).toBe("Maintenance scheduled");
  });

  it("checks availability accurately", async () => {
    const booking = await AllocationEngine.requestBooking(reqInst, "staff_1", {
      poolId,
      hostInstitutionId: hostInst,
      title: "Existing Booking",
      startsAt: "2026-11-15T10:00:00Z",
      endsAt: "2026-11-15T12:00:00Z",
    });
    await AllocationEngine.approveBooking(hostInst, booking.id, "staff_approver");

    // Overlapping check
    const check1 = await AllocationEngine.checkAvailability(
      poolId,
      "2026-11-15T11:00:00Z",
      "2026-11-15T13:00:00Z"
    );
    expect(check1.available).toBe(false);
    expect(check1.conflictingBookings).toHaveLength(1);

    // Non-overlapping check
    const check2 = await AllocationEngine.checkAvailability(
      poolId,
      "2026-11-15T13:00:00Z",
      "2026-11-15T15:00:00Z"
    );
    expect(check2.available).toBe(true);
    expect(check2.conflictingBookings).toHaveLength(0);
  });
});
