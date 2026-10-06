"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type QuickActionCardProps = {
  icon: LucideIcon;
  label: string;
  color: string;
  onClick?: () => void;
  href?: string;
  isEnabled?: boolean;
};

export function QuickActionCard({
  icon: Icon,
  label,
  color,
  onClick,
  href,
  isEnabled = true,
}: QuickActionCardProps) {
  const inner = (
    <div
      className={cn(
        "flex h-full flex-col items-center justify-center gap-2 rounded-xl border p-4 text-center transition-all duration-150",
        isEnabled
          ? "bg-card border-muted hover:border-primary/40 hover:shadow-sm"
          : "bg-card border-muted opacity-50"
      )}
    >
      <span className={cn("flex h-10 w-10 items-center justify-center rounded-full", color)}>
        <Icon className="h-5 w-5 text-white" aria-hidden="true" />
      </span>
      <span className="text-sm font-medium text-foreground">{label}</span>
    </div>
  );

  if (href && isEnabled) {
    return (
      <Link href={href} onClick={onClick} aria-label={label} className="block h-full">
        {inner}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!isEnabled}
      aria-label={label}
      className="h-full w-full text-left"
    >
      {inner}
    </button>
  );
}
