import { RetentionPolicyEngine } from "../retention-policy";

describe("RetentionPolicyEngine", () => {
  let engine: RetentionPolicyEngine;

  beforeEach(() => {
    engine = new RetentionPolicyEngine({
      hotDays: 30,
      warmDays: 90,
      coldDays: 365,
    });
  });

  it("categorizes snapshot created 5 days ago as HOT", () => {
    const now = new Date("2026-08-19T00:00:00Z");
    const snapshotDate = new Date("2026-08-14T00:00:00Z"); // 5 days ago

    const result = engine.evaluateRetention(snapshotDate, now);
    expect(result.tier).toBe("HOT");
    expect(result.shouldDelete).toBe(false);
  });

  it("categorizes snapshot created 45 days ago as WARM", () => {
    const now = new Date("2026-08-19T00:00:00Z");
    const snapshotDate = new Date("2026-07-05T00:00:00Z"); // 45 days ago

    const result = engine.evaluateRetention(snapshotDate, now);
    expect(result.tier).toBe("WARM");
    expect(result.shouldDelete).toBe(false);
  });

  it("categorizes snapshot created 120 days ago as COLD", () => {
    const now = new Date("2026-08-19T00:00:00Z");
    const snapshotDate = new Date("2026-04-21T00:00:00Z"); // 120 days ago

    const result = engine.evaluateRetention(snapshotDate, now);
    expect(result.tier).toBe("COLD");
    expect(result.shouldDelete).toBe(false);
  });

  it("marks snapshot older than 365 days for deletion", () => {
    const now = new Date("2026-08-19T00:00:00Z");
    const snapshotDate = new Date("2025-08-01T00:00:00Z"); // >365 days ago

    const result = engine.evaluateRetention(snapshotDate, now);
    expect(result.tier).toBe("COLD");
    expect(result.shouldDelete).toBe(true);
  });
});
