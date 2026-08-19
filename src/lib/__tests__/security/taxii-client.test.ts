/**
 * Unit tests for TAXII 2.1 Polling Client & Threat Ingestion Pipeline (TIF-011)
 */

import { TaxiiClient } from "../../security/threat-intel/taxii-client";
import { ThreatFeedIngester } from "../../security/threat-intel/feed-ingester";
import { ThreatFeedConfig } from "../../security/threat-intel/threat-feed-config";
import { QuarantineManager } from "../../security/quarantine-manager";
import { StixBundle } from "../../security/threat-intel/stix-types";

describe("TAXII 2.1 Client & Feed Ingester (TIF-011)", () => {
  const mockFeed: ThreatFeedConfig = {
    id: "feed-test-1",
    name: "Test Campus Threat Feed",
    url: "https://threats.test.edu/taxii2/objects/",
    authType: "none",
    pollIntervalMinutes: 60,
    autoQuarantineConfidenceThreshold: 80,
    status: "active",
    indicatorCount: 0,
  };

  const sampleBundle: StixBundle = {
    id: "bundle--taxii-test",
    type: "bundle",
    objects: [
      {
        id: "indicator--high-conf",
        type: "indicator",
        pattern: "[ipv4-addr:value = '198.51.100.150']",
        confidence: 90,
        valid_from: "2026-08-01T00:00:00Z",
        name: "Active brute force bot",
      },
      {
        id: "indicator--med-conf",
        type: "indicator",
        pattern: "[ipv4-addr:value = '198.51.100.160']",
        confidence: 65,
        valid_from: "2026-08-01T00:00:00Z",
        name: "Low velocity crawler",
      },
    ],
  };

  beforeEach(() => {
    QuarantineManager.getInstance().reset();
  });

  it("polls TAXII endpoint and parses response bundle", async () => {
    const originalFetch = global.fetch;
    const mockFetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      headers: new Headers({ etag: '"etag-123"' }),
      json: async () => sampleBundle,
    })) as any;
    global.fetch = mockFetch;

    try {
      const client = TaxiiClient.getInstance();
      const result = await client.pollCollection(mockFeed);

      expect(result.notModified).toBe(false);
      expect(result.etag).toBe('"etag-123"');
      expect(result.bundle?.objects.length).toBe(2);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("handles 304 Not Modified correctly", async () => {
    const originalFetch = global.fetch;
    const mockFetch = jest.fn(async () => ({
      ok: false,
      status: 304,
      headers: new Headers(),
    })) as any;
    global.fetch = mockFetch;

    try {
      const client = TaxiiClient.getInstance();
      const result = await client.pollCollection({ ...mockFeed, lastEtag: '"etag-123"' });

      expect(result.notModified).toBe(true);
      expect(result.bundle).toBeNull();
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("ingests bundle, auto-quarantining high-confidence indicators", async () => {
    const ingester = ThreatFeedIngester.getInstance();
    const summary = await ingester.ingestBundle(mockFeed, sampleBundle);

    expect(summary.totalParsed).toBe(2);
    expect(summary.quarantinedCount).toBe(1); // 198.51.100.150 with conf 90 >= 80
    expect(summary.reputationPenalizedCount).toBe(1); // 198.51.100.160 with conf 65 < 80

    // Assert IP quarantine is active
    expect(QuarantineManager.getInstance().isBanned("198.51.100.150")).toBe(true);
    expect(QuarantineManager.getInstance().isBanned("198.51.100.160")).toBe(false);
  });
});
