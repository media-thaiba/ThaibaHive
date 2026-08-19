import { VisitorQrPassService } from "../qr-pass-service";

describe("Cryptographic Visitor QR Pass Service (HMAC-SHA256)", () => {
  it("generates and verifies valid visitor QR pass payload", () => {
    const validFrom = new Date(Date.now() - 60000).toISOString();
    const validUntil = new Date(Date.now() + 3600000).toISOString();

    const issued = VisitorQrPassService.issuePassPayload({
      institutionId: "inst_001",
      visitorId: "vpass_88192",
      hostId: "staff_401",
      validFrom,
      validUntil,
    });

    expect(issued.qrPayload).toContain("VIS|inst_001|vpass_88192|staff_401");
    expect(issued.signature.length).toBe(64); // SHA-256 hex signature length

    const result = VisitorQrPassService.verifyPassPayload(issued.qrPayload);
    expect(result.valid).toBe(true);
    expect(result.payload?.visitorId).toBe("vpass_88192");
    expect(result.payload?.hostId).toBe("staff_401");
  });

  it("detects and rejects tampered QR pass signatures", () => {
    const validFrom = new Date(Date.now() - 60000).toISOString();
    const validUntil = new Date(Date.now() + 3600000).toISOString();

    const issued = VisitorQrPassService.issuePassPayload({
      institutionId: "inst_001",
      visitorId: "vpass_88192",
      hostId: "staff_401",
      validFrom,
      validUntil,
    });

    // Tamper with visitorId in payload
    const tampered = issued.qrPayload.replace("vpass_88192", "vpass_FORGED");
    const result = VisitorQrPassService.verifyPassPayload(tampered);

    expect(result.valid).toBe(false);
    expect(result.reason).toContain("Invalid cryptographic HMAC signature");
  });

  it("rejects expired visitor QR passes", () => {
    const validFrom = new Date(Date.now() - 7200000).toISOString(); // 2h ago
    const validUntil = new Date(Date.now() - 3600000).toISOString(); // 1h ago

    const issued = VisitorQrPassService.issuePassPayload({
      institutionId: "inst_001",
      visitorId: "vpass_99001",
      hostId: "staff_401",
      validFrom,
      validUntil,
    });

    const result = VisitorQrPassService.verifyPassPayload(issued.qrPayload);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("expired or not yet valid");
  });
});
