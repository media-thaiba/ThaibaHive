"use client";

import { Check, CheckCheck, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReadReceiptBadgeProps {
  status?: "sending" | "sent" | "delivered" | "read" | "failed";
  className?: string;
}

export function ReadReceiptBadge({ status = "sent", className }: ReadReceiptBadgeProps) {
  if (status === "sending") {
    return (
      <span title="Sending..." className={cn("inline-flex items-center text-muted-foreground/60", className)}>
        <Clock className="w-3 h-3 animate-spin" />
      </span>
    );
  }

  if (status === "failed") {
    return (
      <span title="Failed to send" className={cn("inline-flex items-center text-destructive", className)}>
        <AlertCircle className="w-3 h-3" />
      </span>
    );
  }

  if (status === "read") {
    return (
      <span title="Read" className={cn("inline-flex items-center text-primary", className)}>
        <CheckCheck className="w-3.5 h-3.5" />
      </span>
    );
  }

  if (status === "delivered") {
    return (
      <span title="Delivered" className={cn("inline-flex items-center text-muted-foreground", className)}>
        <CheckCheck className="w-3.5 h-3.5" />
      </span>
    );
  }

  // "sent"
  return (
    <span title="Sent" className={cn("inline-flex items-center text-muted-foreground/70", className)}>
      <Check className="w-3 h-3" />
    </span>
  );
}
