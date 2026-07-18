"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Search, Bell, Settings, Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserAvatarDropdown } from "@/components/layout/user-avatar-dropdown";
import { subscribeNotifications } from "@/lib/realtime/notifications";

type Notification = {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  referenceType?: string | null;
  referenceId?: string | null;
  createdAt: string;
};

type ShellNavProps = {
  onSearchOpen: () => void;
};

export function ShellNav({ onSearchOpen }: ShellNavProps) {
  const { staff } = useAuth();
  const { theme, setTheme } = useTheme();
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);

  const fetchNotifications = useCallback(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((d) => {
        const notifs: Notification[] = d.notifications || [];
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

  async function markRead(id?: string) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await fetch("/api/notifications").then((r) => r.json());
    setNotifications(data.notifications || []);
    setUnread(data.unreadCount || 0);
  }

  return (
    <>
      {/* Brand */}
      <Link href="/" className="flex items-center gap-3 font-semibold text-base tracking-tight shrink-0 group">
        <img
          src="/Logo/thl_logo.svg"
          alt="ThaibaHive Logo"
          width={36}
          height={36}
          className="rounded-lg transition-transform duration-200 group-hover:scale-105 h-9 w-9"
        />
        <img
          src="/Logo/thl_name.svg"
          alt="ThaibaHive"
          width={160}
          height={40}
          className="hidden sm:block object-contain h-10 w-auto"
        />
      </Link>

      {/* Right side */}
      <div className="flex items-center gap-1 ml-auto">
        {/* Search - visible on mobile only (desktop has sidebar search) */}
        <button
          onClick={onSearchOpen}
          className="lg:hidden flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-150"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Search...</span>
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => {
              setNotifOpen(!notifOpen);
              if (!notifOpen) markRead();
            }}
            className="relative rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-150 min-w-[40px] min-h-[40px] flex items-center justify-center"
          >
            <Bell className="h-[18px] w-[18px]" />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground animate-scale-in">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>
          {notifOpen && (
            <>
              <div
                className="fixed inset-0 z-[var(--z-dropdown)]"
                onClick={() => setNotifOpen(false)}
              />
              <div className="absolute right-0 top-full z-[var(--z-dropdown)] mt-2 w-80 rounded-xl border bg-popover shadow-lg animate-in fade-in-0 zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <span className="text-sm font-semibold">
                    Notifications
                  </span>
                  {unread > 0 && (
                    <span className="text-xs text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-full">
                      {unread} new
                    </span>
                  )}
                </div>
                <div className="max-h-80 overflow-auto divide-y">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center">
                      <Bell className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">
                        No notifications yet
                      </p>
                    </div>
                  ) : (
                    notifications.slice(0, 10).map((n) => {
                      const hrefMap: Record<string, string> = {
                        announcement: "/announcements",
                        event: "/events",
                        circular: "/circulars",
                        poll: "/polls",
                      };
                      const href = n.referenceType ? (hrefMap[n.referenceType] || "#") : "#";
                      return (
                        <Link
                          key={n.id}
                          href={href}
                          onClick={() => {
                            setNotifOpen(false);
                            if (!n.isRead) markRead(n.id);
                          }}
                          className={cn(
                            "block px-4 py-3 text-xs hover:bg-muted/50 transition-colors",
                            !n.isRead && "bg-primary/[0.03]"
                          )}
                        >
                          <div className="flex items-start gap-2">
                            {!n.isRead && (
                              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-foreground">{n.title}</p>
                              <p className="text-muted-foreground mt-0.5 line-clamp-2">
                                {n.message}
                              </p>
                              <p className="mt-1 text-[10px] text-muted-foreground">
                                {new Date(n.createdAt).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </p>
                            </div>
                          </div>
                        </Link>
                      );
                    })
                  )}
                </div>
                <Link
                  href="/settings"
                  onClick={() => setNotifOpen(false)}
                  className="block border-t px-4 py-2.5 text-center text-xs text-primary font-medium hover:bg-muted/50 transition-colors rounded-b-xl"
                >
                  View all notifications
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          onClick={() => {
            const themes: Array<"light" | "dark" | "system"> = ["light", "dark", "system"];
            const currentIndex = themes.indexOf(theme);
            const nextTheme = themes[(currentIndex + 1) % themes.length];
            setTheme(nextTheme);
          }}
          className="rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-150 min-w-[40px] min-h-[40px] flex items-center justify-center"
          title={`Theme: ${theme}`}
        >
          {theme === "light" && <Sun className="h-[18px] w-[18px]" />}
          {theme === "dark" && <Moon className="h-[18px] w-[18px]" />}
          {theme === "system" && <Monitor className="h-[18px] w-[18px]" />}
        </button>

        {/* Settings - hidden on mobile, bottom nav has it */}
        <Link
          href="/settings"
          className="hidden sm:flex rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-150 min-w-[40px] min-h-[40px] items-center justify-center"
        >
          <Settings className="h-[18px] w-[18px]" />
        </Link>

        {/* User menu */}
        <UserAvatarDropdown />
      </div>
    </>
  );
}
