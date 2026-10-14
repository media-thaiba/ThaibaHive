import { ExpirySweeper } from "../expiry-sweeper";
import { AllocationEngine } from "../allocation-engine";
import { ResourcePoolService } from "../resource-pool";
import { AllocationLedger } from "../allocation-ledger";

describe("Wave 4: ExpirySweeper & Stale Request Cleanup (Gate 19)", () => {
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
      regionalGroupId: "reg_east",
      resourceType: "lab",
      name: "Bio Lab 1",
    });
    poolId = pool.id;
  });

  afterEach(() => {
    AllocationEngine.clearMemory();
    ResourcePoolService.clearMemory();
    AllocationLedger.clearMemory();
  });

  it("enforces Gate 19: sweeps expired requests and records audit entry", async () => {
    // 1. Booking with past expiresAt (stale)
    const staleBooking = await AllocationEngine.requestBooking(reqInst, "staff_user1", {
      poolId,
      hostInstitutionId: hostInst,
      title: "Stale Booking",
      startsAt: "2026-12-01T09:00:00Z",
      endsAt: "2026-12-01T12:00:00Z",
      expiresAt: "2020-01-01T00:00:00Z", // Past!
    });

    // 2. Booking with future expiresAt (active)
    const activeBooking = await AllocationEngine.requestBooking(reqInst, "staff_user2", {
      poolId,
      hostInstitutionId: hostInst,
      title: "Active Future Booking",
      startsAt: "2026-12-02T09:00:00Z",
      endsAt: "2026-12-02T12:00:00Z",
      expiresAt: "2030-01-01T00:00:00Z", // Future!
    });

    // Run sweep
    const count = await ExpirySweeper.sweepExpiredRequests();
    expect(count).toBe(1);

    // Verify stale booking transitioned to 'expired'
    const updatedStale = await AllocationEngine.getBooking(staleBooking.id);
    expect(updatedStale?.status).toBe("expired");

    // Verify active booking is still 'requested'
    const updatedActive = await AllocationEngine.getBooking(activeBooking.id);
    expect(updatedActive?.status).toBe("requested");

    // Verify Merkle audit chain has 'expired' action
    const history = await AllocationLedger.getHistory(staleBooking.id);
    const expiredEntry = history.find((e) => e.action === "expired");
    expect(expiredEntry).toBeDefined();
    expect(expiredEntry?.actorId).toBe("system:expiry-sweeper");
  });
});
