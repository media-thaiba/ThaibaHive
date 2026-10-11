"use client";

import { useCallback, useEffect, useState } from "react";

export type FeatureFlags = Record<string, boolean>;

/**
 * Reads tenant feature flags from GET /api/features.
 *
 * `flags` stays `null` until the first successful response (or on a failed fetch),
 * in which case `isFeatureEnabled` degrades to `true` — the API routes remain the
 * source of truth and will still return 403 when a flag is off. This keeps a flaky
 * network from permanently locking operators out of a cockpit that the server
 * would actually allow.
 */
export function useFeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlags | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/features");
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setFlags((data.flags || {}) as FeatureFlags);
      }
    } catch {
      // Leave flags as-is; the server still enforces.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload().catch(() => {});
  }, [reload]);

  const isFeatureEnabled = useCallback(
    (flag: string) => (flags === null ? true : flags[flag] !== false),
    [flags]
  );

  return { flags, loading, reload, isFeatureEnabled };
}
