import { db } from "@/db";
import { presence, staffInstitutions } from "@thaiba/db/schema";
import { eq } from "drizzle-orm";
import { logActivity } from "@/lib/api/activity-log";

export type SSEConnection = {
  controller: ReadableStreamDefaultController;
  writer: WritableStreamDefaultWriter;
  institutionIds?: string[];
};

const globalForSSE = globalThis as unknown as {
  sseConnections?: Map<string, Set<SSEConnection>>;
  disconnectTimers?: Map<string, ReturnType<typeof setTimeout>>;
  institutionConnections?: Map<string, Set<SSEConnection>>;
  globalNotificationConnections?: Set<SSEConnection>;
};

export const sseConnections =
  globalForSSE.sseConnections ?? new Map<string, Set<SSEConnection>>();
export const disconnectTimers =
  globalForSSE.disconnectTimers ?? new Map<string, ReturnType<typeof setTimeout>>();
export const institutionConnections =
  globalForSSE.institutionConnections ?? new Map<string, Set<SSEConnection>>();
export const globalNotificationConnections =
  globalForSSE.globalNotificationConnections ?? new Set<SSEConnection>();

// Unconditionally attach in Node runtime to prevent split-brain under module re-evaluation
globalForSSE.sseConnections = sseConnections;
globalForSSE.disconnectTimers = disconnectTimers;
globalForSSE.institutionConnections = institutionConnections;
globalForSSE.globalNotificationConnections = globalNotificationConnections;

const DISCONNECT_DEBOUNCE_MS = 5_000;

export function registerSSEConnection(key: string, conn: SSEConnection) {
  let set = sseConnections.get(key);
  if (!set) {
    set = new Set();
    sseConnections.set(key, set);
  }
  set.add(conn);

  // Maintain reverse index for institution event broadcasting
  if (key.startsWith("notification-")) {
    if (conn.institutionIds && conn.institutionIds.length > 0) {
      for (const instId of conn.institutionIds) {
        let instSet = institutionConnections.get(instId);
        if (!instSet) {
          instSet = new Set();
          institutionConnections.set(instId, instSet);
        }
        instSet.add(conn);
      }
    } else {
      globalNotificationConnections.add(conn);
    }
  }
}

export function unregisterSSEConnection(key: string, conn: SSEConnection) {
  const set = sseConnections.get(key);
  if (set) {
    set.delete(conn);
    if (set.size === 0) {
      sseConnections.delete(key);
    }
  }

  // Clean up reverse index
  if (key.startsWith("notification-")) {
    if (conn.institutionIds && conn.institutionIds.length > 0) {
      for (const instId of conn.institutionIds) {
        const instSet = institutionConnections.get(instId);
        if (instSet) {
          instSet.delete(conn);
          if (instSet.size === 0) {
            institutionConnections.delete(instId);
          }
        }
      }
    } else {
      globalNotificationConnections.delete(conn);
    }
  }
}

export function sendToConnection(
  key: string,
  channel: string,
  data: Record<string, unknown>
) {
  const set = sseConnections.get(key);
  if (!set || set.size === 0) return;

  const payload = `event: ${channel}\ndata: ${JSON.stringify(data)}\n\n`;
  const toEvict: SSEConnection[] = [];

  for (const conn of set) {
    try {
      conn.writer.write(new TextEncoder().encode(payload));
    } catch {
      toEvict.push(conn);
    }
  }

  for (const conn of toEvict) {
    set.delete(conn);
  }

  if (set.size === 0) {
    sseConnections.delete(key);
  }
}

export function connectionCount(key: string): number {
  return sseConnections.get(key)?.size ?? 0;
}

export function broadcastDashboardEvent(
  staffId: string,
  channel: string,
  data: Record<string, unknown>
) {
  sendToConnection(`notification-${staffId}`, channel, data);
}

export function broadcastInstitutionEvent(
  institutionId: string,
  channel: string,
  data: Record<string, unknown>
) {
  const payload = `event: ${channel}\ndata: ${JSON.stringify(data)}\n\n`;
  const encoded = new TextEncoder().encode(payload);

  const targets = new Set<SSEConnection>();

  const instSet = institutionConnections.get(institutionId);
  if (instSet) {
    for (const conn of instSet) {
      targets.add(conn);
    }
  }

  for (const conn of globalNotificationConnections) {
    targets.add(conn);
  }

  // Fallback to legacy scan if no index matches (safeguard against non-indexed connections)
  if (targets.size === 0) {
    for (const [key, set] of sseConnections.entries()) {
      if (!key.startsWith("notification-")) continue;
      for (const conn of set) {
        if (!conn.institutionIds || conn.institutionIds.includes(institutionId)) {
          targets.add(conn);
        }
      }
    }
  }

  for (const conn of targets) {
    try {
      conn.writer.write(encoded);
    } catch {
      // Handled on next write
    }
  }
}

// ─── Presence-aware SSE helpers ───

export async function broadcastPresence(
  staffId: string,
  online: boolean,
  lastSeenAt: string,
  status?: string,
  statusText?: string | null
) {
  const set = sseConnections.get("presence");
  if (!set || set.size === 0) {
    return;
  }

  const payload = { type: "change", staffId, online, lastSeenAt, status, statusText };
  const encoded = new TextEncoder().encode(`event: presence\ndata: ${JSON.stringify(payload)}\n\n`);

  // Parallelize connection set lookup and DB query
  let updaterInstIds: string[] = [];
  try {
    const updaterInsts = await db
      .select({ institutionId: staffInstitutions.institutionId })
      .from(staffInstitutions)
      .where(eq(staffInstitutions.staffId, staffId))
      .all();
    updaterInstIds = updaterInsts.map((i) => i.institutionId).filter(Boolean);
  } catch (err) {
    console.error("Failed to query updater institutions in broadcastPresence:", err);
  }

  const updaterInstSet = new Set(updaterInstIds);

  for (const conn of set) {
    const sharesInstitution =
      !conn.institutionIds ||
      conn.institutionIds.length === 0 ||
      conn.institutionIds.some((id) => updaterInstSet.has(id));

    if (sharesInstitution) {
      try {
        conn.writer.write(encoded);
      } catch (err) {
        console.error(`Failed to write presence broadcast for staff ID ${staffId}:`, err);
      }
    }
  }
}

export function onNotificationConnect(staffId: string) {
  // Cancel any pending disconnect timer
  const timer = disconnectTimers.get(staffId);
  if (timer) {
    clearTimeout(timer);
    disconnectTimers.delete(staffId);
  }
}

export function onNotificationDisconnect(staffId: string) {
  // Debounce: wait 5s before setting offline
  const timer = setTimeout(async () => {
    disconnectTimers.delete(staffId);
    const now = new Date().toISOString();
    try {
      // Check if user is still online before executing offline logic
      const current = await db
        .select({ online: presence.online })
        .from(presence)
        .where(eq(presence.staffId, staffId))
        .get();

      if (current?.online) {
        await db
          .update(presence)
          .set({ online: false, lastSeenAt: now, updatedAt: now })
          .where(eq(presence.staffId, staffId));
        broadcastPresence(staffId, false, now);

        // Log the logout/disconnect activity event
        await logActivity({
          staffId,
          action: "LOGOUT",
          resourceType: "auth",
        });
      }
    } catch (err) {
      console.error("Failed to disconnect presence for staff ID:", staffId, err);
    }
  }, DISCONNECT_DEBOUNCE_MS);
  disconnectTimers.set(staffId, timer);
}

export async function reconcilePresenceOnBoot(): Promise<void> {
  try {
    await db.update(presence).set({ online: false });
  } catch {
    // Non-blocking
  }
}
