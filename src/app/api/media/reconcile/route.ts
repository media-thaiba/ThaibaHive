import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { mediaAssets } from "@/db/schema";
import { eq, or, and, lt } from "drizzle-orm";
import crypto from "crypto";
import { verifySession } from "@/lib/auth";
import {
  downloadFromSupabase,
  copySupabaseObject,
  deleteFromSupabase,
  isStorageConfigured,
} from "@/lib/storage";

const STALE_THRESHOLD_MINUTES = 10;

export async function POST(req: NextRequest) {
  try {
    // 1. Security Check: CRON_SECRET header OR super_admin session
    const cronHeader = req.headers.get("x-cron-secret");
    const envCronSecret = process.env.CRON_SECRET;
    let isAuthorized = false;

    if (cronHeader && envCronSecret) {
      const headerBuf = Buffer.from(cronHeader);
      const envBuf = Buffer.from(envCronSecret);
      if (headerBuf.length === envBuf.length && crypto.timingSafeEqual(headerBuf, envBuf)) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      const session = await verifySession();
      if (session && session.role === "super_admin") {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized: Invalid CRON_SECRET or session" }, { status: 401 });
    }

    // 2. Find stuck assets updated > 10 minutes ago
    const cutoffTime = new Date(Date.now() - STALE_THRESHOLD_MINUTES * 60 * 1000).toISOString();

    const stuckAssets = await db
      .select({
        id: mediaAssets.id,
        status: mediaAssets.status,
        fileUrl: mediaAssets.fileUrl,
        updatedAt: mediaAssets.updatedAt,
      })
      .from(mediaAssets)
      .where(
        and(
          or(eq(mediaAssets.status, "processing"), eq(mediaAssets.status, "failed")),
          lt(mediaAssets.updatedAt, cutoffTime)
        )
      )
      .all();

    let recovered = 0;
    let cleaned = 0;
    let skippedDueToRecentClaim = 0;

    for (const asset of stuckAssets) {
      const nowIso = new Date().toISOString();

      // ── Optimistic Locking ─────────────────────────────────────────────────
      // Atomically claim the row by updating updatedAt to nowIso while verifying
      // that status and updatedAt match our observed snapshot.
      // Note: If a worker crashes post-claim, the updated_at timestamp remains fresh;
      // the asset self-heals after the 10-minute STALE_THRESHOLD_MINUTES window expires.
      const claimResult = await db
        .update(mediaAssets)
        .set({ updatedAt: nowIso })
        .where(
          and(
            eq(mediaAssets.id, asset.id),
            eq(mediaAssets.status, asset.status),
            eq(mediaAssets.updatedAt, asset.updatedAt)
          )
        )
        .run();

      const changes = (claimResult as unknown as { changes?: number })?.changes ?? 1;
      if (changes === 0) {
        skippedDueToRecentClaim++;
        continue; // Claimed by a concurrent worker — skip cleanly
      }

      if (!isStorageConfigured || !asset.fileUrl) {
        continue;
      }

      const rawPath = asset.fileUrl.replace(/^\/api\/upload\/files\//, "");

      if (rawPath.includes("private_tmp")) {
        const assetsPath = rawPath.replace("private_tmp", "assets");
        // Check if promoted file already exists in Supabase Storage
        const promotedFile = await downloadFromSupabase(assetsPath);

        if (promotedFile) {
          // File was successfully promoted to assets/ — update DB status to ready
          const newFileUrl = `/api/upload/files/${assetsPath}`;
          await db
            .update(mediaAssets)
            .set({ status: "ready", fileUrl: newFileUrl, updatedAt: new Date().toISOString() })
            .where(eq(mediaAssets.id, asset.id))
            .run();
          recovered++;

          // Clean up leftover private_tmp object best-effort
          try {
            await deleteFromSupabase([rawPath]);
          } catch { /* best-effort */ }
        } else {
          // Check if temp file still exists in private_tmp
          const tempFile = await downloadFromSupabase(rawPath);
          if (tempFile) {
            // Re-attempt promotion
            try {
              await copySupabaseObject(rawPath, assetsPath);
              await deleteFromSupabase([rawPath]);
              const newFileUrl = `/api/upload/files/${assetsPath}`;
              await db
                .update(mediaAssets)
                .set({ status: "ready", fileUrl: newFileUrl, updatedAt: new Date().toISOString() })
                .where(eq(mediaAssets.id, asset.id))
                .run();
              recovered++;
            } catch {
              // Permanently mark failed
              await db
                .update(mediaAssets)
                .set({ status: "failed", updatedAt: new Date().toISOString() })
                .where(eq(mediaAssets.id, asset.id))
                .run();
            }
          } else {
            // Neither file exists — mark failed and clean up
            await db
              .update(mediaAssets)
              .set({ status: "failed", updatedAt: new Date().toISOString() })
              .where(eq(mediaAssets.id, asset.id))
              .run();
            cleaned++;
          }
        }
      }
    }

    return NextResponse.json({
      totalChecked: stuckAssets.length,
      recovered,
      cleaned,
      skippedDueToRecentClaim,
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Reconciliation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
