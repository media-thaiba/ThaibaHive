/**
 * Unit tests for STIX 2.1 Threat Indicator Parser (TIF-010)
 */

import { StixParser } from "../../security/threat-intel/stix-parser";
import { StixBundle } from "../../security/threat-intel/stix-types";

describe("StixParser (TIF-010)", () => {
  const sampleBundle: StixBundle = {
    id: "bundle--001",
    type: "bundle",
    objects: [
      {
        id: "indicator--ipv4-1",
        type: "indicator",
        spec_version: "2.1",
        pattern: "[ipv4-addr:value = '198.51.100.55']",
        valid_from: "2026-08-01T00:00:00Z",
        confidence: 90,
        name: "Malicious scanner node",
      },
      {
        id: "indicator--cidr-1",
        type: "indicator",
        pattern: "[ipv4-addr:value = '203.0.113.0/24']",
        valid_from: "2026-08-01T00:00:00Z",
        confidence: 85,
      },
      {
        id: "indicator--domain-1",
        type: "indicator",
        pattern: "[domain-name:value = 'phishing-portal.xyz']",
        valid_from: "2026-08-01T00:00:00Z",
        confidence: 75,
      },
      {
        id: "indicator--expired-1",
        type: "indicator",
        pattern: "[ipv4-addr:value = '192.0.2.1']",
        valid_from: "2026-01-01T00:00:00Z",
        valid_until: "2026-01-02T00:00:00Z", // Expired in past
        confidence: 50,
      },
      {
        id: "identity--non-indicator",
        type: "identity" as any,
        name: "Educational SOC",
      },
    ],
  };

  it("parses valid STIX indicators from bundle JSON", () => {
    const indicators = StixParser.parseBundle(sampleBundle);
    expect(indicators.length).toBe(4);

    const ipv4Ind = indicators.find((i) => i.value === "198.51.100.55");
    expect(ipv4Ind).toBeDefined();
    expect(ipv4Ind?.type).toBe("ipv4-addr");
    expect(ipv4Ind?.confidence).toBe(90);
    expect(ipv4Ind?.isExpired).toBe(false);

    const cidrInd = indicators.find((i) => i.value === "203.0.113.0/24");
    expect(cidrInd).toBeDefined();
    expect(cidrInd?.type).toBe("cidr");

    const domainInd = indicators.find((i) => i.value === "phishing-portal.xyz");
    expect(domainInd).toBeDefined();
    expect(domainInd?.type).toBe("domain-name");

    const expiredInd = indicators.find((i) => i.value === "192.0.2.1");
    expect(expiredInd?.isExpired).toBe(true);
  });

  it("generates valid STIX 2.1 bundles from indicator list", () => {
    const bundle = StixParser.generateBundle([
      { value: "198.51.100.99", type: "ipv4-addr", confidence: 95 },
      { value: "malware.top", type: "domain-name", confidence: 80 },
    ]);

    expect(bundle.type).toBe("bundle");
    expect(bundle.objects.length).toBe(2);
    expect(bundle.objects[0].pattern).toContain("198.51.100.99");
  });
});
