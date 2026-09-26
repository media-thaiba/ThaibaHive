"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { NotificationBadge } from "./NotificationBadge";
import { Check } from "lucide-react";
import { ensureArray } from "@/lib/utils";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: "notif-1",
      title: "New Expense Claim",
      message: "An expense claim for $1,250.00 requires your HOD approval.",
      timestamp: new Date().toISOString(),
      read: false,
    },
  ]);

  const safeNotifications = ensureArray<NotificationItem>(notifications);
  const unreadCount = safeNotifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between border-b pb-2">
        <div className="flex items-center gap-2">
          <NotificationBadge count={unreadCount} />
          <span className="font-semibold text-sm">Approver Alerts</span>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            <Check className="w-3.5 h-3.5" /> Mark all read
          </button>
        )}
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto text-xs">
        {safeNotifications.map((n) => (
          <div
            key={n.id}
            className={`p-2 rounded border ${
              n.read ? "bg-muted/30" : "bg-primary/5 border-primary/20"
            }`}
          >
            <div className="font-semibold text-foreground">{n.title}</div>
            <div className="text-muted-foreground">{n.message}</div>
            <div className="text-[10px] text-muted-foreground mt-1">
              {new Date(n.timestamp).toLocaleTimeString()}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
