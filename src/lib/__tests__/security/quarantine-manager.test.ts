/**
 * Unit Tests for QuarantineStore and QuarantineManager
 * Sprint-038 / AGS-006 & Sprint-039 / TIF-003 (TD-017)
 */

import { QuarantineManager } from "../../security/quarantine-manager";
import { QuarantineStore } from "../../security/quarantine-store";

describe("QuarantineStore & Manager (AGS-006 & TIF-003)", () => {
  let manager: QuarantineManager;

  beforeEach(() => {
    manager = new QuarantineManager();
    manager.reset();
  });

  it("should quarantine individual IP and prevent access", () => {
    const ip = "198.51.100.45";
    expect(manager.isBanned(ip)).toBe(false);

    manager.quarantineIp(ip, "DPoP replay burst attack", 60_000);
    expect(manager.isBanned(ip)).toBe(true);

    // Other IP in different subnet not banned
    expect(manager.isBanned("198.51.101.45")).toBe(false);
  });

  it("should auto-contain /24 subnet when >= 3 attacking IPs in same subnet are quarantined", () => {
    const ip1 = "192.0.2.10";
    const ip2 = "192.0.2.20";
    const ip3 = "192.0.2.30";

    const res1 = manager.quarantineIp(ip1, "credential stuffing", 60_000);
    expect(res1.subnetContained).toBe(false);

    const res2 = manager.quarantineIp(ip2, "credential stuffing", 60_000);
    expect(res2.subnetContained).toBe(false);

    const res3 = manager.quarantineIp(ip3, "credential stuffing", 60_000);
    expect(res3.subnetContained).toBe(true);
    expect(res3.record.cidrMask).toBe("/24");

    // Any other IP in 192.0.2.0/24 should now be blocked
    expect(manager.isBanned("192.0.2.99")).toBe(true);
    expect(manager.isBanned("192.0.2.254")).toBe(true);
  });

  it("should allowlisted IP bypass quarantine", () => {
    const ip = "203.0.113.10";
    manager.allowlistIp(ip, "Trusted institution gateway");

    manager.quarantineIp(ip, "False positive trigger", 60_000);
    expect(manager.isBanned(ip)).toBe(false);
  });

  it("should expire quarantines automatically", () => {
    const ip = "203.0.113.99";
    const store = manager.getStore();
    const now = Date.now();

    store.addQuarantine({
      id: "test-expired",
      tenantId: "default",
      ipAddress: ip,
      cidrMask: "/32",
      reason: "Temporary scan",
      threatScore: 100,
      bannedBy: "system",
      expiresAt: now - 1000, // already expired
      isActive: true,
      createdAt: now - 5000,
    });

    expect(store.isQuarantined(ip, "default", now).quarantined).toBe(false);
  });

  it("should unban IP manually", () => {
    const ip = "198.51.100.88";
    manager.quarantineIp(ip, "Manual test", 60_000);
    expect(manager.isBanned(ip)).toBe(true);

    const unbanned = manager.unban(ip);
    expect(unbanned).toBe(true);
    expect(manager.isBanned(ip)).toBe(false);
  });
});
