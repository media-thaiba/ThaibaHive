import { NextResponse } from "next/server";
import crypto from "crypto";
import { db, isPostgres } from "@/db";
import { mediaAssets, mediaFolders } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { resolveScopedInstitutionId } from "@/lib/auth";
import { isMediaQueueEnabled } from "@/lib/features";
import { mediaUploadCompleteSchema } from "@/lib/validation/schemas";
import {
  copySupabaseObject,
  deleteFromSupabase,
  downloadFromSupabase,
  isStorageConfigured,
} from "@/lib/storage";
import { eq, and, sql } from "drizzle-orm";

export const runtime = "nodejs";
export const maxDuration = 60;

function fileTypeFromMime(mime: string): "image" | "video" | "audio" | "document" {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return "document";
}

async function hashStream(stream: ReadableStream): Promise<string> {
  const hash = crypto.createHash("sha256");
  const reader = stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) hash.update(Buffer.from(value));
  }
  return hash.digest("hex");
}

export const POST = requireAuth(async (req, session) => {
  try {
    const scopedInstitutionId = await resolveScopedInstitutionId(session.institutionId);
    const institutionId =
      scopedInstitutionId && scopedInstitutionId !== "global" ? scopedInstitutionId : null;

    if (!isMediaQueueEnabled(session.institutionId ?? undefined)) {
      return NextResponse.json(
        { error: "Media queue feature is disabled" },
        { status: 403 }
      );
    }

    if (!isStorageConfigured) {
      return NextResponse.json(
        { error: "Direct completion requires Supabase Storage; use multipart mode" },
        { status: 409 }
      );
    }

    const parsed = mediaUploadCompleteSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { clientEventId, path, sha256, name, mime, size, folderId } = parsed.data;

    // D15*: the client-supplied path is untrusted. It must sit inside the
    // tenant prefix derived from THIS session, otherwise a caller could
    // promote/hash-copy another tenant's object into their own asset row.
    const tenantSlug = institutionId ?? "default";
    const expectedPrefix = `private_tmp/tenant_${tenantSlug}/`;
    if (!path.startsWith(expectedPrefix) || path.includes("..") || path.includes("\\")) {
      return NextResponse.json({ error: "Path outside tenant scope" }, { status: 403 });
    }
    if (!/^[a-fA-F0-9-]{36}\.[a-zA-Z0-9]+$/.test(path.slice(path.lastIndexOf("/") + 1))) {
      return NextResponse.json({ error: "Invalid object name" }, { status: 400 });
    }

    if (folderId) {
      const folder = await db
        .select({ id: mediaFolders.id, institutionId: mediaFolders.institutionId })
        .from(mediaFolders)
        .where(eq(mediaFolders.id, folderId))
        .get();
      if (!folder) {
        return NextResponse.json({ error: "Folder not found" }, { status: 404 });
      }
      if (institutionId && folder.institutionId && folder.institutionId !== institutionId) {
        return NextResponse.json({ error: "Folder outside tenant scope" }, { status: 403 });
      }
    }

    // Idempotency: a repeated completion (clientEventId) or an identical
    // re-upload by the same user (sha256) returns the existing asset.
    const scopedAssetWhere = institutionId
      ? eq(mediaAssets.institutionId, institutionId)
      : sql`${mediaAssets.institutionId} IS NULL`;

    const byEventId = await db
      .select()
      .from(mediaAssets)
      .where(
        and(
          scopedAssetWhere,
          eq(mediaAssets.createdById, session.staffId),
          isPostgres ? sql`(${mediaAssets.metadata}::jsonb ->> 'clientEventId') = ${clientEventId}` : sql`json_extract(${mediaAssets.metadata}, '$.clientEventId') = ${clientEventId}`
        )
      )
      .get();
    if (byEventId) {
      return NextResponse.json({ asset: byEventId, deduped: true });
    }

    const byHash = await db
      .select()
      .from(mediaAssets)
      .where(
        and(
          scopedAssetWhere,
          eq(mediaAssets.createdById, session.staffId),
          folderId ? eq(mediaAssets.folderId, folderId) : sql`${mediaAssets.folderId} IS NULL`,
          isPostgres ? sql`(${mediaAssets.metadata}::jsonb ->> 'sha256') = ${sha256.toLowerCase()}` : sql`json_extract(${mediaAssets.metadata}, '$.sha256') = ${sha256.toLowerCase()}`
        )
      )
      .get();
    if (byHash) {
      return NextResponse.json({ asset: byHash, deduped: true });
    }

    // Stream-verify the stored object against the client-declared digest.
    const stored = await downloadFromSupabase(path);
    if (!stored) {
      return NextResponse.json({ error: "Uploaded object not found" }, { status: 404 });
    }
    const actualHash = await hashStream(stored.stream);
    if (actualHash !== sha256.toLowerCase()) {
      try {
        await deleteFromSupabase([path]);
      } catch {
        /* best-effort cleanup */
      }
      return NextResponse.json({ error: "checksum_mismatch" }, { status: 422 });
    }

    // Promote private_tmp → assets (same pattern as the reconcile cron).
    const assetsPath = path.replace(/^private_tmp\//, "assets/");
    await copySupabaseObject(path, assetsPath);
    try {
      await deleteFromSupabase([path]);
    } catch {
      /* best-effort temp cleanup */
    }

    const now = new Date().toISOString();
    const metadata: Record<string, unknown> = {
      sha256: actualHash,
      clientEventId,
      verified: true,
      mode: "presign",
      size,
    };

    // Check-then-insert inside a transaction to narrow the idempotency race
    // (no unique index exists on metadata; residual duplicates are benign).
    const asset = await db.transaction(async (tx) => {
      const dup = await tx
        .select({ id: mediaAssets.id })
        .from(mediaAssets)
        .where(
          and(
            scopedAssetWhere,
            eq(mediaAssets.createdById, session.staffId),
            isPostgres ? sql`(${mediaAssets.metadata}::jsonb ->> 'clientEventId') = ${clientEventId}` : sql`json_extract(${mediaAssets.metadata}, '$.clientEventId') = ${clientEventId}`
          )
        )
        .get();
      if (dup) {
        return tx.select().from(mediaAssets).where(eq(mediaAssets.id, dup.id)).get();
      }
      return tx
        .insert(mediaAssets)
        .values({
          id: crypto.randomUUID(),
          name,
          fileUrl: `/api/upload/files/${assetsPath}`,
          fileSize: size,
          mimeType: mime,
          fileType: fileTypeFromMime(mime),
          status: "ready",
          folderId: folderId || null,
          metadata,
          createdById: session.staffId,
          institutionId,
          createdAt: now,
          updatedAt: now,
        })
        .returning()
        .get();
    });

    return NextResponse.json({ asset, deduped: false }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to complete upload";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}, "media:create");
