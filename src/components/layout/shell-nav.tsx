"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { usePathname } from "next/navigation";
import { Search, Bell, Settings, Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserAvatarDropdown } from "@/components/layout/user-avatar-dropdown";

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

const quickLinks = [
  { href: "/attendance", label: "Attendance" },
  { href: "/tasks", label: "Tasks" },
  { href: "/leaves", label: "Leaves" },
];

export function ShellNav({ onSearchOpen }: ShellNavProps) {
  const pathname = usePathname();
  const { staff, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!staff) return;
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
  }, [staff]);

  function isActive(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

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
      <Link href="/" className="font-semibold text-base tracking-tight shrink-0">
        ThaibaHive
      </Link>

      {/* Quick links - hidden on mobile */}
      <nav className="hidden md:flex items-center gap-1 flex-1">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm transition-colors",
              isActive(link.href)
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {/* Right side */}
      <div className="flex items-center gap-1 ml-auto">
        {/* Search - visible on mobile only (desktop has sidebar search) */}
        <button
          onClick={onSearchOpen}
          className="lg:hidden flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted transition-colors"
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
            className="relative rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <Bell className="h-4.5 w-4.5" />
            {unread > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>
          {notifOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setNotifOpen(false)}
              />
              <div className="absolute right-0 top-full z-20 mt-1 w-80 rounded-xl border bg-popover shadow-lg animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between border-b px-4 py-2.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    Notifications
                  </span>
                  {unread > 0 && (
                    <span className="text-xs text-primary font-medium">
                      {unread} new
                    </span>
                  )}
                </div>
                <div className="max-h-72 overflow-auto divide-y">
                  {notifications.length === 0 ? (
                    <p className="p-4 text-xs text-muted-foreground text-center">
                      No notifications yet
                    </p>
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
                          <p className="font-semibold text-foreground">{n.title}</p>
                          <p className="text-muted-foreground mt-0.5">
                            {n.message}
                          </p>
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            {new Date(n.createdAt).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                        </Link>
                      );
                    })
                  )}
                </div>
                <Link
                  href="/settings"
                  onClick={() => setNotifOpen(false)}
                  className="block border-t p-2.5 text-center text-xs text-primary font-medium hover:bg-secondary transition-colors rounded-b-xl"
                >
                  View all
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
          className="rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          title={`Theme: ${theme}`}
        >
          {theme === "light" && <Sun className="h-4.5 w-4.5" />}
          {theme === "dark" && <Moon className="h-4.5 w-4.5" />}
          {theme === "system" && <Monitor className="h-4.5 w-4.5" />}
        </button>

        {/* Settings - hidden on mobile, bottom nav has it */}
        <Link
          href="/settings"
          className="hidden sm:flex rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors min-w-[44px] min-h-[44px] items-center justify-center"
        >
          <Settings className="h-4.5 w-4.5" />
        </Link>

        {/* User menu */}
        <UserAvatarDropdown />
      </div>
    </>
  );
}
