import { AntiPassbackEngine, APBLastEvent } from "../anti-passback-engine";

describe("AntiPassbackEngine", () => {
  const now = new Date().toISOString();

  describe("5-Tier Anti-Passback State Evaluation", () => {
    it("allows access if no previous transit is on record", () => {
      const result = AntiPassbackEngine.evaluate("in", "gate_1", "zone_main", null, "hard");
      expect(result.allowed).toBe(true);
      expect(result.isViolation).toBe(false);
    });

    it("allows access when transitioning in opposite direction ('in' followed by 'out')", () => {
      const lastEvent: APBLastEvent = {
        direction: "in",
        deviceId: "gate_1",
        zoneId: "zone_main",
        timestamp: new Date(Date.now() - 60000).toISOString(),
      };

      const result = AntiPassbackEngine.evaluate("out", "gate_1", "zone_main", lastEvent, "hard");
      expect(result.allowed).toBe(true);
      expect(result.isViolation).toBe(false);
    });

    it("blocks access under Hard APB on repeated 'in' transit", () => {
      const lastEvent: APBLastEvent = {
        direction: "in",
        deviceId: "gate_1",
        zoneId: "zone_main",
        timestamp: new Date(Date.now() - 60000).toISOString(),
      };

      const result = AntiPassbackEngine.evaluate("in", "gate_2", "zone_main", lastEvent, "hard");
      expect(result.allowed).toBe(false);
      expect(result.isViolation).toBe(true);
      expect(result.violationReason).toContain("Hard anti-passback violation");
    });

    it("allows access but flags violation alarm under Soft APB", () => {
      const lastEvent: APBLastEvent = {
        direction: "in",
        deviceId: "gate_1",
        zoneId: "zone_main",
        timestamp: new Date(Date.now() - 60000).toISOString(),
      };

      const result = AntiPassbackEngine.evaluate("in", "gate_2", "zone_main", lastEvent, "soft");
      expect(result.allowed).toBe(true);
      expect(result.isViolation).toBe(true);
      expect(result.violationReason).toContain("Soft anti-passback violation");
    });

    it("enforces cooldown window under Timed APB", () => {
      const recentEvent: APBLastEvent = {
        direction: "in",
        deviceId: "gate_1",
        zoneId: "zone_main",
        timestamp: new Date(Date.now() - 100000).toISOString(), // 100s ago
      };

      // 300s cooldown -> should be blocked
      const blockedResult = AntiPassbackEngine.evaluate(
        "in",
        "gate_1",
        "zone_main",
        recentEvent,
        "timed",
        { cooldownSeconds: 300 }
      );
      expect(blockedResult.allowed).toBe(false);
      expect(blockedResult.isViolation).toBe(true);

      // Old event (>300s ago) -> should be allowed
      const oldEvent: APBLastEvent = {
        direction: "in",
        deviceId: "gate_1",
        zoneId: "zone_main",
        timestamp: new Date(Date.now() - 400000).toISOString(),
      };
      const allowedResult = AntiPassbackEngine.evaluate(
        "in",
        "gate_1",
        "zone_main",
        oldEvent,
        "timed",
        { cooldownSeconds: 300 }
      );
      expect(allowedResult.allowed).toBe(true);
      expect(allowedResult.isViolation).toBe(false);
    });

    it("forgives double-swipe re-strike within jitter window (3-5s)", () => {
      const instantDuplicate: APBLastEvent = {
        direction: "in",
        deviceId: "turnstile_1",
        zoneId: "zone_main",
        timestamp: new Date(Date.now() - 2000).toISOString(), // 2 seconds ago at same device
      };

      const result = AntiPassbackEngine.evaluate(
        "in",
        "turnstile_1",
        "zone_main",
        instantDuplicate,
        "forgiving",
        { jitterWindowSeconds: 5 }
      );
      expect(result.allowed).toBe(true);
      expect(result.isViolation).toBe(false);
    });

    it("always permits access when APB mode is disabled", () => {
      const lastEvent: APBLastEvent = {
        direction: "in",
        deviceId: "gate_1",
        zoneId: "zone_main",
        timestamp: new Date(Date.now() - 10000).toISOString(),
      };

      const result = AntiPassbackEngine.evaluate("in", "gate_1", "zone_main", lastEvent, "disabled");
      expect(result.allowed).toBe(true);
      expect(result.isViolation).toBe(false);
    });
  });
});
