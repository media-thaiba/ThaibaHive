"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeNotifications } from "@/lib/realtime/notifications";

export type AppNotification = {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  referenceType?: string | null;
  referenceId?: string | null;
  createdAt: string;
};

export function useNotifications() {
  const { staff } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);

  const fetchNotifications = useCallback(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((d) => {
        const notifs: AppNotification[] = d.notifications || [];
        const savedPrefs = localStorage.getItem("notification_preferences");
        if (savedPrefs) {
          try {
            const prefs = JSON.parse(savedPrefs);
            const filtered = notifs.filter((n) => {
              if (n.referenceType === "announcement" && !prefs.announcements) return false;
              if (n.referenceType === "event" && !prefs.events) return false;
              if (n.referenceType === "poll" && !prefs.polls) return false;
              if (n.referenceType === "circular" && !prefs.circulars) return false;
              return true;
            });
            setNotifications(filtered);
            setUnread(filtered.filter((n) => !n.isRead).length);
            return;
          } catch {
            // Ignore error, fallback
          }
        }
        setNotifications(notifs);
        setUnread(d.unreadCount || 0);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!staff) return;
    fetchNotifications();
  }, [staff, fetchNotifications]);

  useEffect(() => {
    if (!staff) return;
    const unsubscribe = subscribeNotifications(() => {
      fetchNotifications();
    });
    return unsubscribe;
  }, [staff, fetchNotifications]);

  const markRead = useCallback(async (id?: string) => {
    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((n) => (!id || n.id === id ? { ...n, isRead: true } : n))
    );
    setUnread((prev) => (id ? Math.max(0, prev - 1) : 0));

    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnread(data.unreadCount || 0);
      }
    } catch {
      // Gracefully maintain optimistic state on network failure
    }
  }, []);

  return { notifications, unread, markRead };
}
