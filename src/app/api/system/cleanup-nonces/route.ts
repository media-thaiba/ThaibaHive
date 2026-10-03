import { NextResponse } from "next/server";
import { db } from "@/db";
import { usedNonces } from "@/db/schema";
import { lt } from "drizzle-orm";
import { requireAuth } from "@/lib/api/auth-guard";

/**
 * POST /api/system/cleanup-nonces
 *
 * Deletes expired nonce records from the `used_nonces` table.
 * Intended to be called periodically by a CI cron or external scheduler
 * (e.g. Vercel Cron, GitHub Actions scheduled workflow, or a health-check ping).
 *
 * Requires the `system:admin` permission — only `super_admin` may invoke.
 *
 * Response: { deleted: number, ranAt: string }
 */
export const POST = requireAuth(async (_request) => {
  const now = new Date().toISOString();

  const expired = await db
    .select({ jti: usedNonces.jti })
    .from(usedNonces)
    .where(lt(usedNonces.expiresAt, now))
    .all();

  if (expired.length === 0) {
    return NextResponse.json({ deleted: 0, ranAt: now });
  }

  // Delete in a single query — SQLite supports multi-row deletes with lt
  await db.delete(usedNonces).where(lt(usedNonces.expiresAt, now)).run();

  return NextResponse.json({ deleted: expired.length, ranAt: now });
}, "system:admin");
