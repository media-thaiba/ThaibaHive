/**
 * STIX 2.1 Threat Indicator Parser and Bundle Generator
 * Sprint-039 / TIF-010
 */

import { StixBundle, StixIndicatorObject, ParsedThreatIndicator, StixIndicatorType } from "./stix-types";

export class StixParser {
  private static readonly IPV4_PATTERN = /ipv4-addr:value\s*=\s*'([^']+)'/i;
  private static readonly IPV6_PATTERN = /ipv6-addr:value\s*=\s*'([^']+)'/i;
  private static readonly CIDR_PATTERN = /(?:network-traffic:dst_ref\.value|ipv4-addr:value)\s*=\s*'([^']+\/\d{1,2})'/i;
  private static readonly DOMAIN_PATTERN = /domain-name:value\s*=\s*'([^']+)'/i;
  private static readonly URL_PATTERN = /url:value\s*=\s*'([^']+)'/i;

  /**
   * Parses a raw STIX 2.1 JSON bundle string or object into structured threat indicators.
   */
  public static parseBundle(raw: string | object, nowMs: number = Date.now()): ParsedThreatIndicator[] {
    let bundle: StixBundle;

    if (typeof raw === "string") {
      try {
        bundle = JSON.parse(raw);
      } catch {
        return [];
      }
    } else {
      bundle = raw as StixBundle;
    }

    if (!bundle || !Array.isArray(bundle.objects)) {
      return [];
    }

    const results: ParsedThreatIndicator[] = [];

    for (const obj of bundle.objects) {
      if (obj.type !== "indicator" || !obj.pattern) {
        continue;
      }

      const indicator = obj as StixIndicatorObject;
      const parsed = StixParser.parseIndicator(indicator, nowMs);
      if (parsed) {
        results.push(parsed);
      }
    }

    return results;
  }

  /**
   * Parses a single STIX indicator object.
   */
  public static parseIndicator(obj: StixIndicatorObject, nowMs: number = Date.now()): ParsedThreatIndicator | null {
    if (!obj.pattern) return null;

    const pattern = obj.pattern;
    let type: StixIndicatorType | null = null;
    let value: string | null = null;

    // Check CIDR first
    const cidrMatch = pattern.match(StixParser.CIDR_PATTERN);
    if (cidrMatch) {
      type = "cidr";
      value = cidrMatch[1];
    } else {
      const ipv4Match = pattern.match(StixParser.IPV4_PATTERN);
      if (ipv4Match) {
        type = "ipv4-addr";
        value = ipv4Match[1];
      } else {
        const ipv6Match = pattern.match(StixParser.IPV6_PATTERN);
        if (ipv6Match) {
          type = "ipv6-addr";
          value = ipv6Match[1];
        } else {
          const domainMatch = pattern.match(StixParser.DOMAIN_PATTERN);
          if (domainMatch) {
            type = "domain-name";
            value = domainMatch[1];
          } else {
            const urlMatch = pattern.match(StixParser.URL_PATTERN);
            if (urlMatch) {
              type = "url";
              value = urlMatch[1];
            }
          }
        }
      }
    }

    if (!type || !value) return null;

    const validFrom = obj.valid_from ? new Date(obj.valid_from).getTime() : nowMs;
    const validUntil = obj.valid_until ? new Date(obj.valid_until).getTime() : undefined;
    const isExpired = validUntil !== undefined && validUntil <= nowMs;

    return {
      indicatorId: obj.id || `indicator--${Math.random().toString(36).substring(2, 9)}`,
      type,
      value,
      confidence: typeof obj.confidence === "number" ? Math.min(100, Math.max(0, obj.confidence)) : 70,
      validFrom,
      validUntil,
      isExpired,
      labels: Array.isArray(obj.labels) ? obj.labels : ["malicious-activity"],
      description: obj.description || obj.name,
    };
  }

  /**
   * Generates a valid STIX 2.1 bundle from a list of threat indicators.
   */
  public static generateBundle(
    indicators: Array<{
      value: string;
      type: StixIndicatorType;
      confidence?: number;
      description?: string;
      labels?: string[];
      validUntil?: Date;
    }>
  ): StixBundle {
    const bundleId = `bundle--${Math.random().toString(36).substring(2, 10)}`;
    const nowIso = new Date().toISOString();

    const objects: StixIndicatorObject[] = indicators.map((ind, idx) => {
      let pattern = "";
      if (ind.type === "cidr") {
        pattern = `[ipv4-addr:value = '${ind.value}']`;
      } else if (ind.type === "ipv4-addr") {
        pattern = `[ipv4-addr:value = '${ind.value}']`;
      } else if (ind.type === "ipv6-addr") {
        pattern = `[ipv6-addr:value = '${ind.value}']`;
      } else if (ind.type === "domain-name") {
        pattern = `[domain-name:value = '${ind.value}']`;
      } else {
        pattern = `[url:value = '${ind.value}']`;
      }

      return {
        id: `indicator--${Date.now()}-${idx}`,
        type: "indicator",
        spec_version: "2.1",
        pattern,
        pattern_type: "stix",
        valid_from: nowIso,
        valid_until: ind.validUntil ? ind.validUntil.toISOString() : undefined,
        confidence: ind.confidence ?? 85,
        name: ind.description || `Malicious ${ind.type} threat indicator`,
        description: ind.description,
        labels: ind.labels || ["malicious-activity", "anonymized-telemetry"],
        created: nowIso,
        modified: nowIso,
      };
    });

    return {
      id: bundleId,
      type: "bundle",
      objects,
    };
  }
}
