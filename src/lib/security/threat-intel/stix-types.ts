/**
 * STIX 2.1 Threat Intelligence Types
 * Sprint-039 / TIF-010
 */

export type StixIndicatorType = "ipv4-addr" | "ipv6-addr" | "cidr" | "domain-name" | "url";

export interface StixIndicatorObject {
  id: string;
  type: "indicator";
  spec_version?: string;
  pattern: string;
  pattern_type?: string;
  valid_from: string;
  valid_until?: string;
  confidence?: number;
  name?: string;
  description?: string;
  labels?: string[];
  created?: string;
  modified?: string;
  [key: string]: unknown;
}

export interface StixBundle {
  id: string;
  type: "bundle";
  objects: Array<StixIndicatorObject | Record<string, unknown>>;
}

export interface ParsedThreatIndicator {
  indicatorId: string;
  type: StixIndicatorType;
  value: string;
  confidence: number;
  validFrom: number;
  validUntil?: number;
  isExpired: boolean;
  labels: string[];
  description?: string;
}
