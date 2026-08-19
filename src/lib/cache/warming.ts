import { setCachedResponse } from "./edge-cache";
import { db } from "../../db";
import { cacheEvents } from "../../db/schema";

/**
 * Predictively pre-warms cache endpoints before login spikes or course schedules.
 */
export async function preWarmEndpointCache(
  tenantId: string,
  cacheKey: string,
  fetchFn: () => Promise<string>,
  ttlSeconds = 300
): Promise<boolean> {
  const id = `warm_${Math.random().toString(36).substring(2, 9)}`;

  try {
    const data = await fetchFn();
    await setCachedResponse(cacheKey, data, ttlSeconds);

    try {
      await db.insert(cacheEvents).values({
        id,
        tenantId,
        cacheKey,
        action: "WARM",
        status: "SUCCESS",
        executedAt: new Date().toISOString(),
      });
    } catch {
      // Fail-silent
    }

    return true;
  } catch (error: any) {
    try {
      await db.insert(cacheEvents).values({
        id,
        tenantId,
        cacheKey,
        action: "WARM",
        status: "FAILED",
        errorMessage: error.message,
        executedAt: new Date().toISOString(),
      });
    } catch {
      // Fail-silent
    }
    return false;
  }
}
