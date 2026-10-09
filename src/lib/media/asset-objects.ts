import { unlink } from "fs/promises";
import { join } from "path";
import { deleteFromSupabase, isStorageConfigured } from "@/lib/storage";

function safeKey(key: string): boolean {
  if (key.includes("\\") || key.includes("\0")) return false;
  const segments = key.split("/");
  if (segments.length === 0 || segments.length > 5) return false;
  return segments.every(
    (s) => /^[A-Za-z0-9._-]+$/.test(s) && s !== "." && s !== ".."
  );
}

/**
 * Best-effort physical deletion of a media object referenced by a fileUrl.
 * - `nas://` → NAS is the source of truth: row-only removal, never unlink.
 * - Supabase keys (flat + nested) → `deleteFromSupabase`.
 * - Local dev (no storage config) → unlink inside `uploads/`.
 * - Google Drive → not implemented (documented gap); row-only removal.
 * Never throws — object cleanup must not block the DB delete.
 */
export async function deleteMediaObject(fileUrl: string | null | undefined): Promise<void> {
  if (!fileUrl) return;
  if (fileUrl.startsWith("nas://")) return;

  const prefix = "/api/upload/files/";
  if (!fileUrl.startsWith(prefix)) return;

  let key: string;
  try {
    key = decodeURIComponent(fileUrl.slice(prefix.length));
  } catch {
    return;
  }
  if (!safeKey(key)) return;

  if (isStorageConfigured) {
    try {
      await deleteFromSupabase([key]);
    } catch {
      /* best-effort */
    }
    return;
  }

  if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    return; // Drive gap — documented in Phase 3 plan
  }

  try {
    await unlink(join(process.cwd(), "uploads", key));
  } catch {
    /* best-effort */
  }
}
