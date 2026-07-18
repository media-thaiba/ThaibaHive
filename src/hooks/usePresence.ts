"use client";

import { useEffect, useState, useCallback } from "react";
import { subscribePresence, type PresenceEvent } from "@/lib/realtime/presence";

type PresenceEntry = {
  staffId: string;
  online: boolean;
  lastSeenAt: string;
  status: string;
  statusText: string | null;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
};

export function usePresence() {
  const [presenceMap, setPresenceMap] = useState<Map<string, PresenceEntry>>(
    new Map()
  );
  const [loaded, setLoaded] = useState(false);

  // Initial fetch
  useEffect(() => {
    fetch("/api/presence")
      .then((r) => r.json())
      .then((data: PresenceEntry[]) => {
        const map = new Map<string, PresenceEntry>();
        for (const entry of data) {
          map.set(entry.staffId, entry);
        }
        setPresenceMap(map);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  // SSE subscription
  useEffect(() => {
    const unsub = subscribePresence((event: PresenceEvent) => {
      setPresenceMap((prev) => {
        const next = new Map(prev);
        const existing = next.get(event.staffId);
        if (existing) {
          next.set(event.staffId, {
            ...existing,
            online: event.online,
            lastSeenAt: event.lastSeenAt,
            status: event.status !== undefined ? event.status : existing.status,
            statusText: event.statusText !== undefined ? event.statusText : existing.statusText,
          });
        } else {
          next.set(event.staffId, {
            staffId: event.staffId,
            online: event.online,
            lastSeenAt: event.lastSeenAt,
            status: event.status ?? "active",
            statusText: event.statusText ?? null,
            firstName: "",
            lastName: "",
            avatarUrl: null,
          });
        }
        return next;
      });
    });
    return unsub;
  }, []);

  const getPresence = useCallback(
    (staffId: string) => presenceMap.get(staffId) ?? null,
    [presenceMap]
  );

  return { presenceMap, getPresence, loaded };
}
