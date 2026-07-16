import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "\u2014";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "\u2014";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-IN", {
    year: "numeric", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

export function formatTime(date: string | Date | null | undefined): string {
  if (!date) return "\u2014";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

export function formatDateRange(start: string | Date, end: string | Date): string {
  return `${formatDate(start)} \u2013 ${formatDate(end)}`;
}

export function ensureArray<T>(value: unknown, fallback: T[] = []): T[] {
  return Array.isArray(value) ? value : fallback;
}

export function timeAgo(date: string | Date): string {
  const now = new Date();
  const then = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  return formatDate(date);
}
