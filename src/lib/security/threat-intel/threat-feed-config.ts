/**
 * Threat Intelligence Feed Configuration
 * Sprint-039 / TIF-011
 */

export interface ThreatFeedConfig {
  id: string;
  name: string;
  url: string;
  authType: "none" | "basic" | "bearer" | "api-key";
  username?: string;
  password?: string;
  token?: string;
  pollIntervalMinutes: number;
  autoQuarantineConfidenceThreshold: number;
  lastSyncAt?: string;
  lastEtag?: string;
  status: "active" | "syncing" | "error" | "paused";
  indicatorCount: number;
  lastErrorMessage?: string;
}

export const DEFAULT_THREAT_FEEDS: ThreatFeedConfig[] = [
  {
    id: "feed-cisa-known-threats",
    name: "CISA Automated Indicator Sharing (AIS)",
    url: "https://taxii.cisa.gov/taxii2/root/collections/threat-indicators/objects/",
    authType: "none",
    pollIntervalMinutes: 60,
    autoQuarantineConfidenceThreshold: 85,
    status: "active",
    indicatorCount: 0,
  },
  {
    id: "feed-edu-federation",
    name: "Higher Education Community Defense Feed",
    url: "https://threat-intel.edu/taxii2/root/collections/campus-scanners/objects/",
    authType: "none",
    pollIntervalMinutes: 30,
    autoQuarantineConfidenceThreshold: 80,
    status: "active",
    indicatorCount: 0,
  },
];
