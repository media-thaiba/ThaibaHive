"use client";

import { useEffect, useCallback } from "react";

export function useRevocationListener(staffId: string | null, onLogout: () => void) {
  const handleRevocationEvent = useCallback(
    (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case "session_invalidated":
            // Token version changed - force logout
            console.warn("Session invalidated by server");
            onLogout();
            break;
          case "account_deactivated":
            // Account deactivated - force logout
            console.warn("Account deactivated");
            onLogout();
            break;
          case "connected":
            // Initial connection confirmed
            break;
          default:
            break;
        }
      } catch {
        // Ignore parse errors
      }
    },
    [onLogout]
  );

  useEffect(() => {
    if (!staffId) return;

    const eventSource = new EventSource("/api/realtime/events");

    eventSource.onmessage = handleRevocationEvent;

    eventSource.onerror = () => {
      // Reconnect on error (handled by browser's EventSource auto-reconnect)
    };

    return () => {
      eventSource.close();
    };
  }, [staffId, handleRevocationEvent]);
}
