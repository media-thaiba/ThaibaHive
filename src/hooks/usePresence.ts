"use client";

import { useEffect, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { subscribePresence, type PresenceEvent } from "@/lib/realtime/presence";

export type PresenceEntry = {
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

  // TanStack Query for initial fetch & caching
  const { data: initialPresence = [], isSuccess } = useQuery({
    queryKey: ["presence"],
    queryFn: async () => {
      const { data, ok } = await api.get<PresenceEntry[]>("/api/presence");
      if (!ok) return [];
      return data ?? [];
    },
    staleTime: 30 * 1000,
  });

  // Populate map when query resolves
  useEffect(() => {
    if (isSuccess && initialPresence.length > 0) {
      const map = new Map<string, PresenceEntry>();
      for (const entry of initialPresence) {
        map.set(entry.staffId, entry);
      }
      setPresenceMap(map);
    }
  }, [initialPresence, isSuccess]);

  // Realtime SSE updates overlaid on query data
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

  return { presenceMap, getPresence, loaded: isSuccess };
}
