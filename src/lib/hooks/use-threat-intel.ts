"use client";

import { useState, useEffect, useCallback } from "react";
import { useDPoP } from "@/lib/hooks/use-dpop";
import { fetchWithDPoP } from "@/lib/api-client";
import { ThreatFeedConfig } from "@/lib/security/threat-intel/threat-feed-config";

export interface ThreatIntelState {
  feeds: ThreatFeedConfig[];
  totalFeeds: number;
  activeFeeds: number;
  totalIndicatorsImported: number;
  loading: boolean;
  error: string | null;
  syncNow: () => Promise<void>;
  addFeed: (data: Partial<ThreatFeedConfig>) => Promise<boolean>;
  refresh: () => void;
}

export function useThreatIntel(): ThreatIntelState {
  const [feeds, setFeeds] = useState<ThreatFeedConfig[]>([]);
  const [totalFeeds, setTotalFeeds] = useState(0);
  const [activeFeeds, setActiveFeeds] = useState(0);
  const [totalIndicatorsImported, setTotalIndicatorsImported] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { attachDPoP } = useDPoP();

  const fetchFeeds = useCallback(async () => {
    try {
      const res = await fetchWithDPoP("/api/admin/security/threat-intel/feeds", {}, attachDPoP);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setFeeds(data.feeds || []);
      setTotalFeeds(data.totalFeeds || 0);
      setActiveFeeds(data.activeFeeds || 0);
      setTotalIndicatorsImported(data.totalIndicatorsImported || 0);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load threat intel feeds");
    } finally {
      setLoading(false);
    }
  }, [attachDPoP]);

  useEffect(() => {
    fetchFeeds();
    const timer = setInterval(fetchFeeds, 10000);
    return () => clearInterval(timer);
  }, [fetchFeeds]);

  const syncNow = async () => {
    try {
      await fetchWithDPoP(
        "/api/admin/security/threat-intel/feeds",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "sync_now" }),
        },
        attachDPoP
      );
      fetchFeeds();
    } catch {
      // Non-blocking
    }
  };

  const addFeed = async (data: Partial<ThreatFeedConfig>): Promise<boolean> => {
    try {
      const res = await fetchWithDPoP(
        "/api/admin/security/threat-intel/feeds",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
        attachDPoP
      );
      if (res.ok) {
        fetchFeeds();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  return {
    feeds,
    totalFeeds,
    activeFeeds,
    totalIndicatorsImported,
    loading,
    error,
    syncNow,
    addFeed,
    refresh: fetchFeeds,
  };
}
