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
};

export const sseConnections =
  globalForSSE.sseConnections ?? new Map<string, Set<SSEConnection>>();
export const disconnectTimers =
  globalForSSE.disconnectTimers ?? new Map<string, ReturnType<typeof setTimeout>>();

if (process.env.NODE_ENV !== "production") {
  globalForSSE.sseConnections = sseConnections;
  globalForSSE.disconnectTimers = disconnectTimers;
}

const DISCONNECT_DEBOUNCE_MS = 5_000;

export function registerSSEConnection(key: string, conn: SSEConnection) {
  let set = sseConnections.get(key);
  if (!set) {
    set = new Set();
    sseConnections.set(key, set);
  }
  set.add(conn);
}

export function unregisterSSEConnection(key: string, conn: SSEConnection) {
  const set = sseConnections.get(key);
  if (!set) return;
  set.delete(conn);
  if (set.size === 0) {
    sseConnections.delete(key);
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

// ─── Presence-aware SSE helpers ───

export async function broadcastPresence(
  staffId: string,
  online: boolean,
  lastSeenAt: string,
  status?: string,
  statusText?: string | null
) {
  const payload = { type: "change", staffId, online, lastSeenAt, status, statusText };
  
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

  // Broadcast to all presence subscribers sharing at least one institution
  const set = sseConnections.get("presence");
  if (set && set.size > 0) {
    const encoded = `event: presence\ndata: ${JSON.stringify(payload)}\n\n`;
    for (const conn of set) {
      const sharesInstitution =
        !conn.institutionIds ||
        conn.institutionIds.some((id) => updaterInstIds.includes(id));
      if (sharesInstitution) {
        try {
          conn.writer.write(new TextEncoder().encode(encoded));
        } catch (err) {
          console.error(`Failed to write presence broadcast for staff ID ${staffId}:`, err);
        }
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
