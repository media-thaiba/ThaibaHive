/**
 * Unit tests for AWS Signature Version 4 Request Signer
 * Sprint-039 / TIF-004 (TD-015)
 */

import { AwsSigV4Signer } from "../../security/aws-sigv4-signer";

describe("AwsSigV4Signer (TIF-004)", () => {
  const mockCredentials = {
    accessKeyId: "AKIAIOSFODNN7EXAMPLE",
    secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    region: "us-east-1",
    service: "wafv2",
  };

  it("identifies present credentials correctly", () => {
    const signer = new AwsSigV4Signer(mockCredentials);
    expect(signer.hasCredentials()).toBe(true);

    const emptySigner = new AwsSigV4Signer({ accessKeyId: "", secretAccessKey: "" });
    expect(emptySigner.hasCredentials()).toBe(false);
  });

  it("generates correctly structured SigV4 headers", () => {
    const signer = new AwsSigV4Signer(mockCredentials);
    const fixedDate = new Date("2026-08-19T12:00:00.000Z");

    const signed = signer.sign({
      method: "POST",
      url: "https://wafv2.us-east-1.amazonaws.com/",
      headers: {
        "Content-Type": "application/x-amz-json-1.1",
        "X-Amz-Target": "AWSWAF_20190729.UpdateIPSet",
      },
      body: JSON.stringify({ Id: "ipset-123", Action: "INSERT" }),
      datetime: fixedDate,
    });

    expect(signed).toHaveProperty("Authorization");
    expect(signed).toHaveProperty("x-amz-date", "20260819T120000Z");
    expect(signed).toHaveProperty("x-amz-content-sha256");

    // Verify Authorization header structure
    expect(signed.Authorization).toContain("AWS4-HMAC-SHA256");
    expect(signed.Authorization).toContain("Credential=AKIAIOSFODNN7EXAMPLE/20260819/us-east-1/wafv2/aws4_request");
    expect(signed.Authorization).toContain("SignedHeaders=");
    expect(signed.Authorization).toContain("Signature=");
  });

  it("includes security token when session token is provided", () => {
    const signer = new AwsSigV4Signer({
      ...mockCredentials,
      sessionToken: "AQoDYXdzEJr1EXAMPLE",
    });

    const signed = signer.sign({
      method: "POST",
      url: "https://wafv2.us-east-1.amazonaws.com/",
      body: "{}",
    });

    expect(signed["x-amz-security-token"]).toBe("AQoDYXdzEJr1EXAMPLE");
    expect(signed.Authorization).toContain("x-amz-security-token");
  });
});
