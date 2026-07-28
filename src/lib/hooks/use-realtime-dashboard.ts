"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

export interface RealtimeDashboardEvent {
  type: string;
  data: Record<string, unknown>;
}

export function useRealtimeDashboard(
  onEvent?: (event: RealtimeDashboardEvent) => void
) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let attempt = 0;
    let isDisposed = false;

    function connect() {
      if (isDisposed) return;

      try {
        eventSource = new EventSource("/api/notifications/subscribe");

        eventSource.addEventListener("leave_status_changed", (e) => {
          try {
            const data = JSON.parse(e.data);
            toast.info(`Leave Request Updated: ${data.status || "Updated"}`, {
              description: data.reason || "Your leave application status has changed.",
            });
            onEventRef.current?.({ type: "leave_status_changed", data });
          } catch (err) {
            console.error("Failed to parse leave_status_changed SSE event", err);
          }
        });

        eventSource.addEventListener("task_assigned", (e) => {
          try {
            const data = JSON.parse(e.data);
            toast.info(`New Task Assigned: ${data.title || "Task"}`, {
              description: data.description || "A new task has been assigned to you.",
            });
            onEventRef.current?.({ type: "task_assigned", data });
          } catch (err) {
            console.error("Failed to parse task_assigned SSE event", err);
          }
        });

        eventSource.addEventListener("task_updated", (e) => {
          try {
            const data = JSON.parse(e.data);
            onEventRef.current?.({ type: "task_updated", data });
          } catch (err) {
            console.error("Failed to parse task_updated SSE event", err);
          }
        });

        eventSource.addEventListener("announcement_published", (e) => {
          try {
            const data = JSON.parse(e.data);
            toast.message(`New Announcement: ${data.title || "Announcement"}`, {
              description: data.message || "A new announcement has been published.",
            });
            onEventRef.current?.({ type: "announcement_published", data });
          } catch (err) {
            console.error("Failed to parse announcement_published SSE event", err);
          }
        });

        eventSource.onopen = () => {
          attempt = 0;
        };

        eventSource.onerror = () => {
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          if (!isDisposed) {
            attempt += 1;
            const backoffMs = Math.min(1000 * Math.pow(2, attempt), 30000);
            reconnectTimeout = setTimeout(connect, backoffMs);
          }
        };
      } catch (err) {
        console.error("Failed to establish SSE EventSource connection:", err);
      }
    }

    connect();

    return () => {
      isDisposed = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (eventSource) eventSource.close();
    };
  }, []);
}
