"use client";

import { cn } from "@/lib/utils";

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  fallback?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeClasses = {
  sm: "h-7 w-7 text-xs",
  md: "h-8 w-8 text-sm",
  lg: "h-10 w-10 text-base",
  xl: "h-12 w-12 text-lg",
};

export function Avatar({ src, alt, fallback, size = "md", className, ...props }: AvatarProps) {
  const [error, setError] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  const initials = React.useMemo(() => {
    if (!fallback) return "?";
    const parts = fallback.trim().split(/\s+/);
    if (parts.length === 1) return parts[0][0]?.toUpperCase() || "?";
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [fallback]);

  const bgColor = React.useMemo(() => {
    if (!fallback) return "hsl(215, 65%, 35%)";
    let hash = 0;
    for (let i = 0; i < fallback.length; i++) {
      hash = fallback.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 65%, 35%)`;
  }, [fallback]);

  return (
    <div
      className={cn("relative inline-flex shrink-0 overflow-hidden rounded-full", sizeClasses[size], className)}
      {...props}
    >
      {src && !error && (
        <img
          src={src}
          alt={alt || fallback || "Avatar"}
          className="aspect-square h-full w-full object-cover"
          onLoad={() => setIsLoading(false)}
          onError={() => setError(true)}
        />
      )}
      {(isLoading || error || !src) && (
        <div
          className="flex h-full w-full items-center justify-center font-medium text-white"
          style={{ backgroundColor: bgColor }}
          aria-hidden="true"
        >
          {initials}
        </div>
      )}
    </div>
  );
}

import React from "react";