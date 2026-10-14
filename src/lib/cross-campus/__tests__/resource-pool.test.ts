import { ResourcePoolService } from "../resource-pool";

describe("Wave 4: ResourcePoolService", () => {
  const homeInst = "inst_campus_alpha";

  beforeEach(() => {
    ResourcePoolService.setUseMemory(true);
    ResourcePoolService.clearMemory();
  });

  afterEach(() => {
    ResourcePoolService.clearMemory();
  });

  it("creates and retrieves a shared resource pool", async () => {
    const pool = await ResourcePoolService.createPool(homeInst, {
      regionalGroupId: "reg_south",
      resourceType: "lab",
      name: "High Performance Computing Lab",
      capacity: 30,
      description: "Equipped with 30 RTX 4090 workstations",
      isActive: true,
    });

    expect(pool).toBeDefined();
    expect(pool.id).toMatch(/^pool_/);
    expect(pool.name).toBe("High Performance Computing Lab");
    expect(pool.capacity).toBe(30);

    const fetched = await ResourcePoolService.getPool(pool.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.id).toBe(pool.id);
  });

  it("lists resource pools with filtering", async () => {
    await ResourcePoolService.createPool(homeInst, {
      regionalGroupId: "reg_south",
      resourceType: "hall",
      name: "Auditorium Alpha",
      capacity: 500,
    });

    await ResourcePoolService.createPool("inst_campus_beta", {
      regionalGroupId: "reg_north",
      resourceType: "bus",
      name: "Campus Shuttle 1",
      capacity: 40,
    });

    const southPools = await ResourcePoolService.listPools({ regionalGroupId: "reg_south" });
    expect(southPools).toHaveLength(1);
    expect(southPools[0].name).toBe("Auditorium Alpha");

    const allBuses = await ResourcePoolService.listPools({ resourceType: "bus" });
    expect(allBuses).toHaveLength(1);
    expect(allBuses[0].name).toBe("Campus Shuttle 1");
  });

  it("updates a resource pool", async () => {
    const pool = await ResourcePoolService.createPool(homeInst, {
      regionalGroupId: "reg_south",
      resourceType: "equipment",
      name: "Spectrometer",
      capacity: 1,
      isActive: true,
    });

    const updated = await ResourcePoolService.updatePool(pool.id, {
      capacity: 2,
      isActive: false,
    });

    expect(updated).not.toBeNull();
    expect(updated?.capacity).toBe(2);
    expect(updated?.isActive).toBe(false);
  });
});
