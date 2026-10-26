import { db } from "@/db";
import { gateLogs } from "@/db/schema";

/**
 * In-memory serialization mutex keyed by visitor ID.
 * Guarantees that concurrent QR scans, check-ins, check-outs, and lifecycle
 * updates on the exact same visitor execute strictly sequentially.
 */
interface LockEntry {
  promise: Promise<void>;
  createdAt: number;
}

const visitorLocks = new Map<string, LockEntry>();
const LOCK_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Periodic cleanup of stale locks
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of visitorLocks.entries()) {
    if (now - entry.createdAt > LOCK_TTL_MS) {
      visitorLocks.delete(id);
    }
  }
}, 60 * 1000);
if (typeof (cleanupInterval as unknown as { unref?: () => void })?.unref === "function") {
  (cleanupInterval as unknown as { unref: () => void }).unref();
}

export async function withVisitorLock<T>(id: string, fn: () => Promise<T>): Promise<T> {
  const currentEntry = visitorLocks.get(id);
  const currentLock = currentEntry?.promise ?? Promise.resolve();
  let release: () => void = () => {};
  const nextLock = new Promise<void>((resolve) => {
    release = resolve;
  });
  const chained = currentLock.then(() => nextLock);

  visitorLocks.set(id, { promise: chained, createdAt: Date.now() });

  try {
    await currentLock;
    return await fn();
  } finally {
    release();
    const entry = visitorLocks.get(id);
    if (entry?.promise === chained) {
      visitorLocks.delete(id);
    }
  }
}

/**
 * In-memory serialization mutex keyed by visitor pre-registration request ID.
 * Prevents concurrent host/admin approvals, rejections, or race transitions.
 */
interface RequestLockEntry {
  promise: Promise<void>;
  createdAt: number;
}

const requestLocks = new Map<string, RequestLockEntry>();
const REQUEST_LOCK_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Periodic cleanup of stale request locks
const cleanupRequestInterval = setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of requestLocks.entries()) {
    if (now - entry.createdAt > REQUEST_LOCK_TTL_MS) {
      requestLocks.delete(id);
    }
  }
}, 60 * 1000);
if (typeof (cleanupRequestInterval as unknown as { unref?: () => void })?.unref === "function") {
  (cleanupRequestInterval as unknown as { unref: () => void }).unref();
}

export async function withVisitorRequestLock<T>(id: string, fn: () => Promise<T>): Promise<T> {
  const currentEntry = requestLocks.get(id);
  const currentLock = currentEntry?.promise ?? Promise.resolve();
  let release: () => void = () => {};
  const nextLock = new Promise<void>((resolve) => {
    release = resolve;
  });
  const chained = currentLock.then(() => nextLock);

  requestLocks.set(id, { promise: chained, createdAt: Date.now() });

  try {
    await currentLock;
    return await fn();
  } finally {
    release();
    const entry = requestLocks.get(id);
    if (entry?.promise === chained) {
      requestLocks.delete(id);
    }
  }
}

export function isTerminalVisitorStatus(status: string): boolean {
  return status === "checked_out";
}

export function isTerminalVisitorRequestStatus(status: string): boolean {
  return ["approved", "rejected", "cancelled"].includes(status);
}

export interface RecordGateLogParams {
  institutionId?: string | null;
  passId?: string | null;
  visitorName: string;
  actionType: "check_in" | "check_out" | "denied";
  gatekeeperId?: string | null;
  deviceId?: string | null;
  notes?: string | null;
}

export async function recordGateLog(params: RecordGateLogParams): Promise<void> {
  if (!params.institutionId || params.institutionId === "global") {
    return;
  }
  try {
    await db.insert(gateLogs).values({
      id: crypto.randomUUID(),
      institutionId: params.institutionId,
      passId: params.passId || null,
      visitorName: params.visitorName,
      actionType: params.actionType,
      gatekeeperId: params.gatekeeperId || null,
      deviceId: params.deviceId || null,
      notes: params.notes || null,
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("[GateLog] Failed to record physical gate log entry:", err);
  }
}
