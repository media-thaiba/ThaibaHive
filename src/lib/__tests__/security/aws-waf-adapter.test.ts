/**
 * Unit tests for AWS WAF Adapter with SigV4 integration
 * Sprint-039 / TIF-004 (TD-015)
 */

import { AwsWafAdapter } from "../../security/waf-adapters/aws-waf";

describe("AwsWafAdapter (TIF-004)", () => {
  it("operates in dry-run mode when unconfigured", async () => {
    const adapter = new AwsWafAdapter({
      ipSetId: "",
      region: "us-east-1",
    });

    const blockResult = await adapter.blockIp("198.51.100.22", "Test reason");
    expect(blockResult.success).toBe(true);

    const unblockResult = await adapter.unblockIp("198.51.100.22");
    expect(unblockResult.success).toBe(true);
  });

  it("attempts signed dispatch when configured with credentials", async () => {
    const originalFetch = global.fetch;
    const mockFetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({}),
    })) as any;
    global.fetch = mockFetch;

    try {
      const adapter = new AwsWafAdapter({
        ipSetId: "test-set-id-999",
        ipSetName: "TestQuarantineSet",
        region: "us-east-1",
        accessKeyId: "AKIAIOSFODNN7EXAMPLE",
        secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
      });

      const result = await adapter.blockIp("198.51.100.77", "Rate limit breach");
      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://wafv2.us-east-1.amazonaws.com/",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: expect.stringContaining("AWS4-HMAC-SHA256"),
          }),
        })
      );
    } finally {
      global.fetch = originalFetch;
    }
  });
});
