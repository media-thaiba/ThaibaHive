/**
 * Unit Tests for QuarantineBloomFilter and QuarantineMesh
 * Sprint-038 / AGS-007
 */

import { QuarantineBloomFilter } from "../../security/quarantine-bloom";
import { QuarantineMesh } from "../../security/quarantine-mesh";
import { QuarantineManager } from "../../security/quarantine-manager";

describe("QuarantineBloomFilter & Mesh (AGS-007)", () => {
  it("should accurately test bloom filter membership", () => {
    const bloom = new QuarantineBloomFilter(1000);
    expect(bloom.mightContain("192.168.1.1")).toBe(false);

    bloom.add("192.168.1.1");
    expect(bloom.mightContain("192.168.1.1")).toBe(true);
    expect(bloom.mightContain("10.0.0.1")).toBe(false);
  });

  it("should handle distributed mesh events and sync across nodes", () => {
    const nodeA = new QuarantineMesh("node-A");
    const nodeB = new QuarantineMesh("node-B");

    const record = {
      id: "q-123",
      tenantId: "default",
      ipAddress: "203.0.113.88",
      cidrMask: "/32",
      reason: "Distributed credential attack",
      threatScore: 100,
      bannedBy: "system",
      expiresAt: Date.now() + 60_000,
      isActive: true,
      createdAt: Date.now(),
    };

    // Node A receives or broadcasts
    nodeB.handleMeshEvent({
      action: "QUARANTINE_ADDED",
      record,
      timestamp: Date.now(),
      originNodeId: "node-A",
    });

    expect(nodeB.fastCheckIsQuarantined("203.0.113.88")).toBe(true);
    expect(nodeB.fastCheckIsQuarantined("198.51.100.1")).toBe(false);

    // Node B receives unban event
    nodeB.handleMeshEvent({
      action: "QUARANTINE_REMOVED",
      ipOrId: "q-123",
      timestamp: Date.now(),
      originNodeId: "node-A",
    });

    expect(nodeB.fastCheckIsQuarantined("203.0.113.88")).toBe(false);
  });
});
