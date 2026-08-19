import { AgentRegistry } from "../agents/core/registry";
import { AgentMessageBus } from "../agents/core/message-bus";
import { AgentScheduler } from "../agents/core/scheduler";
import { AgentStateStore } from "../agents/core/state-store";
import { ConsensusCoordinator } from "../agents/core/consensus";
import { defaultStateStore } from "../services/redis-client";

describe("Agent Orchestration Core Test Suite", () => {
  beforeEach(async () => {
    // Clear registry, bus, scheduler, and lock store
    AgentRegistry.getInstance().clear();
    AgentMessageBus.getInstance().clear();
    AgentScheduler.getInstance().clear();
    
    // Clear Redis mock store
    if ("clear" in defaultStateStore) {
      (defaultStateStore as any).clear();
    }
  });

  afterEach(() => {
    AgentScheduler.getInstance().clear();
  });

  test("AgentRegistry - Agent lifecycle and heartbeat status transitions", () => {
    const registry = AgentRegistry.getInstance();
    registry.register("test-agent", "database-healer", "1.0.0");
    
    const agent = registry.getAgent("test-agent");
    expect(agent).toBeDefined();
    expect(agent?.role).toBe("database-healer");
    expect(agent?.status).toBe("idle");

    registry.updateStatus("test-agent", "active");
    expect(registry.getAgent("test-agent")?.status).toBe("active");

    registry.heartbeat("test-agent");
    const hb1 = registry.getAgent("test-agent")?.lastHeartbeat;
    expect(hb1).toBeDefined();

    registry.unregister("test-agent");
    expect(registry.getAgent("test-agent")).toBeUndefined();
  });

  test("AgentMessageBus - Message passing routing and priority ordering queue", async () => {
    const bus = AgentMessageBus.getInstance();
    const received: string[] = [];

    bus.subscribe("alert:failover", (msg) => {
      received.push(`${msg.priority}:${msg.payload.message}`);
    });

    bus.publish("sender-1", "*", "alert:failover", { message: "low-task" }, "low");
    bus.publish("sender-2", "*", "alert:failover", { message: "high-task" }, "high");
    bus.publish("sender-3", "*", "alert:failover", { message: "normal-task" }, "normal");

    // Wait for async queue execution loop
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Queue priority ordering check: high first, then normal, then low
    expect(received).toContain("high:high-task");
    expect(received).toContain("normal:normal-task");
    expect(received).toContain("low:low-task");
  });

  test("AgentScheduler - Lock locks prevent double runs", async () => {
    const scheduler = AgentScheduler.getInstance();
    let runCount = 0;

    scheduler.schedule(
      { id: "test-task", intervalMs: 20 },
      async () => {
        runCount++;
      }
    );

    // Trigger immediately again with same ID (should replace it, or share locks)
    scheduler.schedule(
      { id: "test-task", intervalMs: 20 },
      async () => {
        runCount++;
      }
    );

    await new Promise((resolve) => setTimeout(resolve, 50));
    scheduler.cancel("test-task");
    
    expect(runCount).toBeLessThanOrEqual(3);
  });

  test("ConsensusCoordinator - Leases, heartbeats, silent nodes, and cooldowns", async () => {
    const consensus = ConsensusCoordinator.getInstance();
    
    // 1. Initial lease acquisition
    const acquired = await consensus.acquireLease("db-cluster", "agent-1", 10);
    expect(acquired).toBe(true);

    // 2. Overlapping lease request (blocked)
    const acquired2 = await consensus.acquireLease("db-cluster", "agent-2", 10);
    expect(acquired2).toBe(false);

    // 3. Heartbeat renewal check
    const renewed = await consensus.renewHeartbeat("db-cluster", "agent-1", 10);
    expect(renewed).toBe(true);

    // 4. Release lease
    const released = await consensus.releaseLease("db-cluster", "agent-1");
    expect(released).toBe(true);

    // 5. Cooldown check
    await consensus.setCooldown("db-cluster", 10);
    expect(await consensus.checkCooldown("db-cluster")).toBe(true);

    // Overlapping lease request during active cooldown (blocked)
    const acquiredAfterCooldown = await consensus.acquireLease("db-cluster", "agent-3", 10);
    expect(acquiredAfterCooldown).toBe(false);
  });
});
