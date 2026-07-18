import { db } from "@/db";
import { activityLogs } from "@thaiba/db/schema";
import { lt } from "drizzle-orm";

function maskIp(ip: string | null | undefined): string | null {
  if (!ip) return null;

  // IPv4: mask last octet
  if (ip.includes(".")) {
    const parts = ip.split(".");
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
    }
  }

  // IPv6: keep first 3 hextets
  if (ip.includes(":")) {
    const parts = ip.split(":");
    if (parts.length >= 4) {
      return `${parts[0]}:${parts[1]}:${parts[2]}::xxx`;
    }
  }

  return ip;
}

function extractIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return null;
}

export interface LogActivityParams {
  request?: Request;
  staffId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  details?: Record<string, unknown> | null;
}

export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    const ip = params.request ? maskIp(extractIp(params.request)) : null;
    const ua = params.request?.headers.get("user-agent") ?? null;

    await db.insert(activityLogs).values({
      staffId: params.staffId ?? null,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId ?? null,
      details: params.details ? JSON.stringify(params.details) : null,
      ipAddress: ip,
      userAgent: ua,
    });
  } catch {
    // Non-blocking — never crash the caller
  }
}

let lastPurgeAt = 0;
const PURGE_INTERVAL_MS = 60 * 60 * 1000; // once per hour

export async function pruneOldLogs(): Promise<void> {
  const now = Date.now();
  if (now - lastPurgeAt < PURGE_INTERVAL_MS) return;
  lastPurgeAt = now;

  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const cutoff = sixMonthsAgo.toISOString();

    await db
      .delete(activityLogs)
      .where(lt(activityLogs.createdAt, cutoff));
  } catch {
    // Non-blocking
  }
}
