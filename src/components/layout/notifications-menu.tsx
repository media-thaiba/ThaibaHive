"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotifications } from "@/components/layout/notifications";

type NotificationsMenuProps = {
  /** "header" = compact icon button (mobile top bar). "row" = full-width sidebar identity row. */
  layout?: "header" | "row";
  collapsed?: boolean;
};

export function NotificationsMenu({ layout = "header", collapsed = false }: NotificationsMenuProps) {
  const { notifications, unread, markRead } = useNotifications();
  const [open, setOpen] = useState(false);

  const hrefMap: Record<string, string> = {
    announcement: "/my-work/announcements",
    event: "/school/events",
    circular: "/school/circulars",
    poll: "/school/polls",
  };

  const trigger =
    layout === "row" ? (
      <DropdownMenuTrigger
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
        className={cn(
          "group relative flex h-12 w-full items-center rounded-xl transition-all duration-200 outline-none hover:bg-foreground/[0.03] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring",
          collapsed && "justify-center"
        )}
        onClick={() => {
          if (!open) markRead();
        }}
      >
        <div className="grid w-full grid-cols-[40px_1fr] items-center">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
            <Bell
              size={20}
              className={cn(
                "transition-colors duration-200",
                unread > 0 ? "text-primary" : "text-foreground/70 group-hover:text-foreground"
              )}
            />
            {unread > 0 && !collapsed && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold leading-none text-primary-foreground animate-scale-in">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
            {unread > 0 && collapsed && (
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary" />
            )}
          </div>
          {!collapsed && (
            <div className="ml-4 flex flex-col overflow-hidden text-left">
              <span className="micro-label mb-1 text-foreground/60 leading-none">Status</span>
              <span className="truncate text-sm font-bold text-foreground/80 leading-none group-hover:text-foreground transition-colors">
                Team Updates
              </span>
            </div>
          )}
        </div>
      </DropdownMenuTrigger>
    ) : (
      <button
        type="button"
        onClick={() => {
          if (!open) markRead();
        }}
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
        aria-expanded={open}
        className="relative flex h-10 w-10 items-center justify-center rounded-lg p-2 text-muted-foreground transition-all duration-150 hover:bg-muted/60 hover:text-foreground"
      >
        <Bell className="h-[18px] w-[18px]" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground animate-scale-in">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
    );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      {layout === "row" ? (
        trigger
      ) : (
        <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      )}
      <DropdownMenuContent
        align={layout === "row" ? "start" : "end"}
        sideOffset={layout === "row" ? 8 : 4}
        className="w-80 rounded-xl border-border bg-popover p-0 shadow-xl"
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="text-sm font-semibold">Notifications</span>
          {unread > 0 && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {unread} new
            </span>
          )}
        </div>
        <div className="max-h-80 overflow-auto divide-y">
          {notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            notifications.slice(0, 10).map((n) => {
              const href = n.referenceType ? (hrefMap[n.referenceType] || "#") : "#";
              return (
                <Link
                  key={n.id}
                  href={href}
                  onClick={() => {
                    setOpen(false);
                    if (!n.isRead) markRead(n.id);
                  }}
                  className={cn(
                    "block px-4 py-3 text-xs transition-colors hover:bg-muted/50",
                    !n.isRead && "bg-primary/[0.03]"
                  )}
                >
                  <div className="flex items-start gap-2">
                    {!n.isRead && (
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground">{n.title}</p>
                      <p className="mt-0.5 text-muted-foreground line-clamp-2">{n.message}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
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
          href="/my-work/settings"
          onClick={() => setOpen(false)}
          className="block rounded-b-xl border-t px-4 py-2.5 text-center text-xs font-medium text-primary transition-colors hover:bg-muted/50"
        >
          View all notifications
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
