import { db } from "@/db";
import { gateLogs } from "@/db/schema";

/**
 * In-memory serialization mutex keyed by visitor ID.
 * Guarantees that concurrent QR scans, check-ins, check-outs, and lifecycle
 * updates on the exact same visitor execute strictly sequentially.
 */
const visitorLocks = new Map<string, Promise<void>>();

export async function withVisitorLock<T>(id: string, fn: () => Promise<T>): Promise<T> {
  const currentLock = visitorLocks.get(id) ?? Promise.resolve();
  let release: () => void = () => {};
  const nextLock = new Promise<void>((resolve) => {
    release = resolve;
  });

  visitorLocks.set(id, currentLock.then(() => nextLock));

  try {
    await currentLock;
    return await fn();
  } finally {
    release();
    if (visitorLocks.get(id) === nextLock) {
      visitorLocks.delete(id);
    }
  }
}

/**
 * In-memory serialization mutex keyed by visitor pre-registration request ID.
 * Prevents concurrent host/admin approvals, rejections, or race transitions.
 */
const requestLocks = new Map<string, Promise<void>>();

export async function withVisitorRequestLock<T>(id: string, fn: () => Promise<T>): Promise<T> {
  const currentLock = requestLocks.get(id) ?? Promise.resolve();
  let release: () => void = () => {};
  const nextLock = new Promise<void>((resolve) => {
    release = resolve;
  });

  requestLocks.set(id, currentLock.then(() => nextLock));

  try {
    await currentLock;
    return await fn();
  } finally {
    release();
    if (requestLocks.get(id) === nextLock) {
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
