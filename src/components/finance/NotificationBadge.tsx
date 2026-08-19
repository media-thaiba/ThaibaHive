"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Bell } from "lucide-react";

interface NotificationBadgeProps {
  count: number;
}

export function NotificationBadge({ count }: NotificationBadgeProps) {
  if (count <= 0) return null;

  return (
    <div className="relative inline-flex items-center">
      <Bell className="w-5 h-5 text-muted-foreground" />
      <Badge
        variant="destructive"
        className="absolute -top-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-[10px] rounded-full"
      >
        {count > 99 ? "99+" : count}
      </Badge>
    </div>
  );
}
