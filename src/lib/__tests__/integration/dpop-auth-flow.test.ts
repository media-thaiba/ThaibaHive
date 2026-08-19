/**
 * IDP-015: Integration test — full DPoP authentication round-trip
 * Tests the chain: key generation → proof creation → middleware validation → session issuance
 */
import { generateDPoPKeyPair, createDPoPProof, verifyDPoPProof } from "@/lib/identity/dpop-engine";

describe("DPoP Auth Flow Integration", () => {
  it("completes a full DPoP round-trip successfully", async () => {
    // 1. Generate device key pair
    const keyPair = await generateDPoPKeyPair();
    expect(keyPair.thumbprint).toBeTruthy();
    expect(keyPair.publicJwk.kty).toBe("EC");

    // 2. Create a DPoP proof for a POST request
    const htm = "POST";
    const htu = "https://api.thaibahive.com/api/auth/login";
    const proof = await createDPoPProof(keyPair.privateKey, htm, htu);
    expect(typeof proof).toBe("string");
    expect(proof.split(".").length).toBe(3);

    // 3. Verify the proof server-side
    const result = await verifyDPoPProof(proof, htm, htu, keyPair.thumbprint);
    expect(result.valid).toBe(true);
    expect(result.thumbprint).toBe(keyPair.thumbprint);
  });

  it("rejects a DPoP proof with wrong htm", async () => {
    const keyPair = await generateDPoPKeyPair();
    const proof = await createDPoPProof(keyPair.privateKey, "POST", "https://example.com/api");
    const result = await verifyDPoPProof(proof, "GET", "https://example.com/api");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("htm");
  });

  it("rejects a replayed DPoP proof", async () => {
    const keyPair = await generateDPoPKeyPair();
    const proof = await createDPoPProof(keyPair.privateKey, "DELETE", "https://example.com/api/resource");
    // First verification succeeds
    const first = await verifyDPoPProof(proof, "DELETE", "https://example.com/api/resource");
    expect(first.valid).toBe(true);
    // Second verification with same proof (same jti) must fail
    const second = await verifyDPoPProof(proof, "DELETE", "https://example.com/api/resource");
    expect(second.valid).toBe(false);
    expect(second.error).toContain("Replayed");
  });

  it("thumbprint matches across generation and proof header", async () => {
    const keyPair = await generateDPoPKeyPair();
    const proof = await createDPoPProof(keyPair.privateKey, "GET", "https://example.com");
    const result = await verifyDPoPProof(proof, "GET", "https://example.com");
    expect(result.valid).toBe(true);
    expect(result.thumbprint).toBe(keyPair.thumbprint);
  });
});
