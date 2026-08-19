"use client";

import { useEffect, useRef } from "react";

type WorkspaceSseEvent = {
  type: string;
  data: Record<string, unknown>;
};

/**
 * useWorkspaceSse — subscribes to the workspace SSE stream for real-time widget refresh.
 *
 * Rule 82: EventSource is closed and all listeners removed on unmount.
 * Implements exponential backoff reconnect (max 5 attempts).
 */
export function useWorkspaceSse(
  role: string,
  onRefresh?: () => void,
  onEvent?: (event: WorkspaceSseEvent) => void
) {
  const onRefreshRef = useRef<(() => void) | undefined>(onRefresh);
  const onEventRef = useRef<((event: WorkspaceSseEvent) => void) | undefined>(onEvent);

  // Keep refs in sync with latest callbacks (avoids stale closures)
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  const roleRef = useRef(role);
  useEffect(() => {
    roleRef.current = role;
  }, [role]);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;
    let isDisposed = false;

    const BACKOFF_DELAYS = [1000, 2000, 4000, 8000, 16000];

    function parseEvent(e: MessageEvent): Record<string, unknown> {
      try {
        return JSON.parse(e.data) as Record<string, unknown>;
      } catch {
        return {};
      }
    }

    function connect() {
      if (isDisposed) return;

      eventSource = new EventSource("/api/workspaces/sse");

      // General workspace refresh
      eventSource.addEventListener("workspace:refresh", () => {
        onRefreshRef.current?.();
      });

      // Role-specific refresh events
      const roleEvents = [
        "workspace:principal:refresh",
        "workspace:teacher:refresh",
        "workspace:cashier:refresh",
        "workspace:parent:refresh",
      ];
      for (const eventType of roleEvents) {
        eventSource.addEventListener(eventType, () => {
          const eventRole = eventType.split(":")[1];
          if (eventRole === roleRef.current) {
            onRefreshRef.current?.();
          }
        });
      }

      // Attendance marked — triggers refresh for principal and teacher
      eventSource.addEventListener("attendance_marked", (e) => {
        const data = parseEvent(e);
        onRefreshRef.current?.();
        onEventRef.current?.({ type: "attendance_marked", data });
      });

      // Payment receipt — triggers refresh for cashier and principal
      eventSource.addEventListener("payment_receipt", (e) => {
        const data = parseEvent(e);
        onRefreshRef.current?.();
        onEventRef.current?.({ type: "payment_receipt", data });
      });

      // Task assigned — informational event only
      eventSource.addEventListener("task_assigned", (e) => {
        const data = parseEvent(e);
        onEventRef.current?.({ type: "task_assigned", data });
      });

      eventSource.onerror = () => {
        eventSource?.close();
        eventSource = null;

        if (isDisposed) return;
        if (attempt < BACKOFF_DELAYS.length) {
          const delay = BACKOFF_DELAYS[attempt];
          attempt++;
          reconnectTimeout = setTimeout(connect, delay);
        }
        // After max attempts, stop reconnecting
      };

      eventSource.onopen = () => {
        attempt = 0; // Reset backoff on successful connection
      };
    }

    connect();

    // Rule 82: Cleanup all listeners and close EventSource on unmount
    return () => {
      isDisposed = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      eventSource?.close();
      eventSource = null;
    };
  }, []); // Empty deps: connection lifecycle managed independently
}
