/**
 * TAXII 2.1 Threat Feed Polling Client
 * Sprint-039 / TIF-011
 */

import { ThreatFeedConfig } from "./threat-feed-config";
import { StixBundle } from "./stix-types";
import { withRetry } from "../retry-backoff";

export interface TaxiiPollResult {
  bundle: StixBundle | null;
  etag?: string;
  notModified: boolean;
  error?: string;
}

export class TaxiiClient {
  private static instance: TaxiiClient | null = null;

  public static getInstance(): TaxiiClient {
    if (!TaxiiClient.instance) {
      TaxiiClient.instance = new TaxiiClient();
    }
    return TaxiiClient.instance;
  }

  /**
   * Polls a TAXII 2.1 collections objects endpoint.
   */
  public async pollCollection(feed: ThreatFeedConfig): Promise<TaxiiPollResult> {
    const headers: Record<string, string> = {
      Accept: "application/taxii+json;version=2.1, application/vnd.oasis.stix+json;version=2.1, application/json",
      "User-Agent": "ThaibaHive-Security-Gateway/3.23.0",
    };

    if (feed.lastEtag) {
      headers["If-None-Match"] = feed.lastEtag;
    }

    if (feed.authType === "basic" && feed.username && feed.password) {
      const encoded = Buffer.from(`${feed.username}:${feed.password}`).toString("base64");
      headers["Authorization"] = `Basic ${encoded}`;
    } else if (feed.authType === "bearer" && feed.token) {
      headers["Authorization"] = `Bearer ${feed.token}`;
    } else if (feed.authType === "api-key" && feed.token) {
      headers["X-Api-Key"] = feed.token;
    }

    try {
      const result = await withRetry(
        async () => {
          const res = await fetch(feed.url, {
            method: "GET",
            headers,
          });

          if (res.status === 304) {
            return {
              bundle: null,
              etag: feed.lastEtag,
              notModified: true,
            };
          }

          if (!res.ok) {
            const err = new Error(`TAXII server returned status ${res.status}`);
            (err as any).status = res.status;
            throw err;
          }

          const etag = res.headers.get("etag") || undefined;
          const bundle = (await res.json()) as StixBundle;

          return {
            bundle,
            etag,
            notModified: false,
          };
        },
        {
          maxAttempts: 3,
          baseDelayMs: 100,
          maxDelayMs: 1000,
        }
      );

      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        bundle: null,
        notModified: false,
        error: msg,
      };
    }
  }
}
