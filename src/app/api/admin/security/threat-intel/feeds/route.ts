/**
 * Admin Threat Intelligence Feeds API Route
 * Sprint-039 / TIF-013
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { DEFAULT_THREAT_FEEDS, ThreatFeedConfig } from "@/lib/security/threat-intel/threat-feed-config";
import { addThreatFeedSchema } from "@/lib/validation/threat-intel-schemas";

let feedsStore: ThreatFeedConfig[] = [...DEFAULT_THREAT_FEEDS];

export const GET = requireAuth(
  async (_request: Request) => {
    return NextResponse.json({
      feeds: feedsStore,
      totalFeeds: feedsStore.length,
      activeFeeds: feedsStore.filter((f) => f.status === "active").length,
      totalIndicatorsImported: feedsStore.reduce((acc, f) => acc + f.indicatorCount, 0),
    });
  },
  "system:threat-intel:view"
);

export const POST = requireAuth(
  async (request: Request) => {
    try {
      const rawBody = await request.json();

      if (rawBody.action === "sync_now") {
        // Trigger simulated sync update
        feedsStore = feedsStore.map((f) => ({
          ...f,
          status: "active",
          lastSyncAt: new Date().toISOString(),
          indicatorCount: f.indicatorCount + 15,
        }));
        return NextResponse.json({ success: true, feeds: feedsStore });
      }

      const validation = addThreatFeedSchema.safeParse(rawBody);
      if (!validation.success) {
        return NextResponse.json(
          { error: "Validation failed", details: validation.error.format() },
          { status: 400 }
        );
      }

      const newFeed: ThreatFeedConfig = {
        id: `feed_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: validation.data.name,
        url: validation.data.url,
        authType: validation.data.authType,
        username: validation.data.username,
        password: validation.data.password,
        token: validation.data.token,
        pollIntervalMinutes: validation.data.pollIntervalMinutes,
        autoQuarantineConfidenceThreshold: validation.data.autoQuarantineConfidenceThreshold,
        status: "active",
        indicatorCount: 0,
        lastSyncAt: new Date().toISOString(),
      };

      feedsStore.push(newFeed);
      return NextResponse.json({ success: true, feed: newFeed }, { status: 201 });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      return NextResponse.json({ error: "Failed to create threat feed", details: msg }, { status: 400 });
    }
  },
  "system:threat-intel:manage"
);
