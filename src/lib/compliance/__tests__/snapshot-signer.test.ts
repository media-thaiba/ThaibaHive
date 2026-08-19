import {
  computeCanonicalChecksum,
  signSnapshotData,
  verifySnapshotSignature,
} from "../snapshot-signer";

describe("Cryptographic Snapshot Signer", () => {
  it("computes deterministic canonical checksum for objects with varying key order", () => {
    const dataA = { beta: 2, alpha: 1, nested: { y: 20, x: 10 } };
    const dataB = { alpha: 1, nested: { x: 10, y: 20 }, beta: 2 };

    const checksumA = computeCanonicalChecksum(dataA);
    const checksumB = computeCanonicalChecksum(dataB);

    expect(checksumA).toBe(checksumB);
    expect(checksumA).toHaveLength(64);
  });

  it("signs and verifies snapshot payloads correctly", () => {
    const payload = "checksum-sha256-string-or-json-manifest";
    const { signature, publicKey } = signSnapshotData(payload);

    expect(signature).toBeDefined();
    expect(publicKey).toBeDefined();

    const isValid = verifySnapshotSignature(payload, signature, publicKey);
    expect(isValid).toBe(true);

    const isTamperedValid = verifySnapshotSignature("tampered-data", signature, publicKey);
    expect(isTamperedValid).toBe(false);
  });
});
