/**
 * Unit Tests for IpReputationEngine
 * Sprint-038 / AGS-005
 */

import { IpReputationEngine } from "../../security/ip-reputation";

describe("IpReputationEngine (AGS-005)", () => {
  let engine: IpReputationEngine;

  beforeEach(() => {
    engine = new IpReputationEngine();
  });

  afterEach(() => {
    engine.reset();
  });

  it("should initialize clean reputation for unknown IP", () => {
    const rep = engine.getReputation("192.168.1.1");
    expect(rep.threatScore).toBe(0);
    expect(rep.classification).toBe("clean");
    expect(rep.quarantineTriggered).toBe(false);
  });

  it("should record signals and transition through threat classifications", () => {
    const ip = "203.0.113.50";
    const now = 1_000_000;

    // Record single stepup failure (+20)
    engine.recordSignal(ip, "stepup_failure", undefined, now);
    let rep = engine.getReputation(ip, now);
    expect(rep.threatScore).toBe(20);
    expect(rep.classification).toBe("clean");

    // Record second stepup failure (+20 -> 40 = suspicious)
    engine.recordSignal(ip, "stepup_failure", undefined, now + 10);
    rep = engine.getReputation(ip, now + 10);
    expect(rep.threatScore).toBe(40);
    expect(rep.classification).toBe("suspicious");

    // Record cross tenant probe (+30 -> 70 = malicious)
    engine.recordSignal(ip, "cross_tenant_probe", undefined, now + 20);
    rep = engine.getReputation(ip, now + 20);
    expect(rep.threatScore).toBe(70);
    expect(rep.classification).toBe("malicious");

    // Record DPoP replay (+25 -> 95 = banned & quarantine triggered)
    engine.recordSignal(ip, "dpop_replay", undefined, now + 30);
    rep = engine.getReputation(ip, now + 30);
    expect(rep.threatScore).toBe(95);
    expect(rep.classification).toBe("banned");
    expect(rep.quarantineTriggered).toBe(true);
  });

  it("should decay expired signals outside the 15-minute sliding window", () => {
    const ip = "198.51.100.22";
    let now = 1_000_000;

    engine.recordSignal(ip, "dpop_replay", undefined, now);
    engine.recordSignal(ip, "dpop_replay", undefined, now);
    expect(engine.getReputation(ip, now).threatScore).toBe(50);

    // Advance time past 15 minutes (900,000 ms)
    now += 15 * 60 * 1000 + 1000;
    const decayed = engine.getReputation(ip, now);
    expect(decayed.threatScore).toBe(0);
    expect(decayed.classification).toBe("clean");
  });
});
