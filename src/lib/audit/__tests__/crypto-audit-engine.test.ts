import {
  computePayloadHash,
  computeAuditBlockHash,
  buildMerkleTree,
  generateMerkleProof,
  verifyMerkleProof,
  verifyAuditChain,
  GENESIS_PREV_HASH,
} from "../crypto-audit-engine";
import { AuditEntry } from "../types";

describe("Cryptographic Audit Engine & Merkle Tree Verification", () => {
  describe("computePayloadHash", () => {
    it("produces deterministic SHA-256 hashes regardless of key ordering", () => {
      const payload1 = { a: 1, b: 2, c: { x: "hello", y: "world" } };
      const payload2 = { c: { y: "world", x: "hello" }, b: 2, a: 1 };

      const hash1 = computePayloadHash(payload1);
      const hash2 = computePayloadHash(payload2);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });

    it("handles null and undefined payloads consistently", () => {
      const hashNull = computePayloadHash(null);
      const hashUndefined = computePayloadHash(undefined);
      expect(hashNull).toBe(hashUndefined);
    });
  });

  describe("computeAuditBlockHash", () => {
    it("computes deterministic block hash chained to previous block", () => {
      const hash = computeAuditBlockHash({
        previousHash: GENESIS_PREV_HASH,
        timestamp: "2026-08-19T10:00:00.000Z",
        tenantId: "tenant-alpha",
        userId: "user-123",
        action: "finance:payment_create",
        entityType: "payment",
        entityId: "pay-999",
        payloadHash: computePayloadHash({ amount: 5000 }),
        nonce: "abc123",
      });

      expect(hash).toHaveLength(64);

      // Mutating any parameter changes the block hash
      const tamperedHash = computeAuditBlockHash({
        previousHash: GENESIS_PREV_HASH,
        timestamp: "2026-08-19T10:00:00.000Z",
        tenantId: "tenant-alpha",
        userId: "user-123",
        action: "finance:payment_create",
        entityType: "payment",
        entityId: "pay-999",
        payloadHash: computePayloadHash({ amount: 999999 }), // Altered amount
        nonce: "abc123",
      });

      expect(hash).not.toBe(tamperedHash);
    });
  });

  describe("Merkle Tree Construction & Inclusion Proofs", () => {
    it("builds correct Merkle tree for even number of leaves", () => {
      const leaves = ["hash1", "hash2", "hash3", "hash4"];
      const { root, tree, depth, leafCount } = buildMerkleTree(leaves);

      expect(root).toHaveLength(64);
      expect(leafCount).toBe(4);
      expect(depth).toBe(3); // Level 0: 4, Level 1: 2, Level 2: 1
      expect(tree.length).toBe(3);
    });

    it("builds correct Merkle tree for odd number of leaves (duplicates odd leaf)", () => {
      const leaves = ["hash1", "hash2", "hash3"];
      const { root, tree, depth, leafCount } = buildMerkleTree(leaves);

      expect(root).toHaveLength(64);
      expect(leafCount).toBe(3);
      expect(depth).toBe(3);
    });

    it("generates and verifies valid Merkle proofs for all leaf indices", () => {
      const leaves = ["leafA", "leafB", "leafC", "leafD", "leafE", "leafF", "leafG"];
      const { root, tree } = buildMerkleTree(leaves);

      for (let i = 0; i < leaves.length; i++) {
        const proof = generateMerkleProof(tree, i);
        const isValid = verifyMerkleProof(leaves[i], proof, root);
        expect(isValid).toBe(true);

        // Verification fails if leaf is altered
        const isTamperedValid = verifyMerkleProof("fake_leaf", proof, root);
        expect(isTamperedValid).toBe(false);
      }
    });
  });

  describe("verifyAuditChain", () => {
    it("verifies a valid sequential hash chain", () => {
      const entries: AuditEntry[] = [];
      let prevHash = GENESIS_PREV_HASH;

      for (let i = 0; i < 5; i++) {
        const timestamp = `2026-08-19T10:0${i}:00.000Z`;
        const payload = { counter: i };
        const payloadHash = computePayloadHash(payload);
        const currentHash = computeAuditBlockHash({
          previousHash: prevHash,
          timestamp,
          tenantId: "tenant-1",
          userId: "user-1",
          action: "update_record",
          entityType: "record",
          entityId: `rec-${i}`,
          payloadHash,
          nonce: "0",
        });

        entries.push({
          id: `audit-${i}`,
          tenantId: "tenant-1",
          userId: "user-1",
          action: "update_record",
          entityType: "record",
          entityId: `rec-${i}`,
          payload,
          previousHash: prevHash,
          currentHash,
          timestamp,
          nonce: "0",
        });

        prevHash = currentHash;
      }

      const result = verifyAuditChain(entries);
      expect(result.valid).toBe(true);
      expect(result.status).toBe("VALID");
      expect(result.totalVerified).toBe(5);
    });

    it("detects payload tampering in the audit chain", () => {
      const entries: AuditEntry[] = [];
      let prevHash = GENESIS_PREV_HASH;

      for (let i = 0; i < 4; i++) {
        const timestamp = `2026-08-19T10:0${i}:00.000Z`;
        const payload = { counter: i };
        const payloadHash = computePayloadHash(payload);
        const currentHash = computeAuditBlockHash({
          previousHash: prevHash,
          timestamp,
          tenantId: "tenant-1",
          userId: "user-1",
          action: "update_record",
          entityType: "record",
          entityId: `rec-${i}`,
          payloadHash,
          nonce: "0",
        });

        entries.push({
          id: `audit-${i}`,
          tenantId: "tenant-1",
          userId: "user-1",
          action: "update_record",
          entityType: "record",
          entityId: `rec-${i}`,
          payload,
          previousHash: prevHash,
          currentHash,
          timestamp,
          nonce: "0",
        });

        prevHash = currentHash;
      }

      // Tamper record at index 2
      entries[2].payload = { counter: 999999 };

      const result = verifyAuditChain(entries);
      expect(result.valid).toBe(false);
      expect(result.status).toBe("CORRUPTED");
      expect(result.brokenIndex).toBe(2);
      expect(result.corruptedAuditId).toBe("audit-2");
    });
  });
});
