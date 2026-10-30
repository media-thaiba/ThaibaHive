import { AsyncLocalStorage } from "node:async_hooks";

export interface MembershipCacheStore {
  memberships: Map<string, string[]>;
  version: number;
}

export const membershipAls = new AsyncLocalStorage<MembershipCacheStore>();

/**
 * Runs an asynchronous execution context with an isolated, request-scoped membership cache.
 * All getStaffInstitutionMemberships calls inside this context share a single Map.
 */
export function withMembershipCache<T>(fn: () => Promise<T>): Promise<T> {
  const store: MembershipCacheStore = {
    memberships: new Map<string, string[]>(),
    version: 0,
  };
  return membershipAls.run(store, fn);
}

/**
 * Explicitly invalidates cached memberships for a staff member during mutation operations.
 */
export function invalidateMembershipCache(staffId: string): void {
  const store = membershipAls.getStore();
  if (store) {
    store.memberships.delete(staffId);
    store.version++;
  }
}
