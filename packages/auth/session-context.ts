import { AsyncLocalStorage } from "node:async_hooks";
import type { SessionPayload } from "./session";

export const sessionAls = new AsyncLocalStorage<SessionPayload>();

/**
 * Returns the active session from the current asynchronous context.
 */
export function getActiveSession(): SessionPayload | undefined {
  return sessionAls.getStore();
}

/**
 * Runs an asynchronous execution context with an isolated, request-scoped session.
 */
export function withSession<T>(session: SessionPayload, fn: () => Promise<T>): Promise<T> {
  return sessionAls.run(session, fn);
}
