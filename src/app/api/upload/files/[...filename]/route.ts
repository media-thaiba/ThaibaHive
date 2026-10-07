import { NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import { join } from "path";
import { downloadFromDrive } from "@/lib/drive";
import { isStorageConfigured, downloadFromSupabase } from "@/lib/storage";
import { verifySession } from "@/lib/auth";
import { contentTypeFor, nodeStreamToWeb } from "@/lib/media/serve-file-utils";

export const runtime = "nodejs";

const UPLOAD_DIR = join(process.cwd(), "uploads");

const UUID_NAME = /^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}\.[a-zA-Z0-9]+$/;
const SAFE_SEGMENT = /^[A-Za-z0-9._-]+$/;

/**
 * D14*: validate a file key that is either
 *  - a flat UUID filename (legacy multipart/Drive uploads), or
 *  - a guarded nested path produced by sign/complete/reconcile:
 *    `assets/tenant_X/dept_Y/uuid.ext` or `private_tmp/tenant_X/dept_Y/uuid.ext`.
 * Segment charset + `..` rejection block traversal; root/tenant prefixes are allowlisted.
 */
export function validateFileKey(segments: string[]): string | null {
  if (segments.length === 0 || segments.length > 5) return null;
  if (segments.some((s) => !SAFE_SEGMENT.test(s) || s === "." || s === "..")) return null;

  if (segments.length === 1) {
    return UUID_NAME.test(segments[0]) ? segments[0] : null;
  }

  const [root, tenant] = segments;
  if ((root !== "assets" && root !== "private_tmp") || !tenant?.startsWith("tenant_")) {
    return null;
  }
  if (!UUID_NAME.test(segments[segments.length - 1])) return null;
  return segments.join("/");
}

// NOTE: All uploaded files are designed to be organization-wide readable by any authenticated session.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string[] | string }> }
) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { filename } = await params;
    const segments = Array.isArray(filename) ? filename : filename.split("/");
    const key = validateFileKey(segments);
    if (!key) {
      return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
    }

    // 1. Prioritize Supabase Storage (flat and nested keys both resolve here)
    if (isStorageConfigured) {
      const supabaseFile = await downloadFromSupabase(key, "uploads");
      if (supabaseFile) {
        return new NextResponse(supabaseFile.stream, {
          headers: {
            "Content-Type": supabaseFile.mimeType,
            "Cache-Control": "private, no-transform, max-age=3600",
          },
        });
      }
      if (segments.length > 1) {
        // Nested keys only ever exist in Supabase — don't fall through to
        // flat local/Drive lookups with a slash-containing key.
        return NextResponse.json({ error: "File not found in Supabase Storage" }, { status: 404 });
      }
    }

    // 2. Production check - fetch from Google Drive (flat keys only)
    if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
      const driveFile = await downloadFromDrive(key);
      if (driveFile) {
        return new NextResponse(nodeStreamToWeb(driveFile.stream), {
          headers: {
            "Content-Type": driveFile.mimeType,
            "Cache-Control": "private, no-transform, max-age=3600",
          },
        });
      }
      if (segments.length > 1) {
        return NextResponse.json({ error: "File not found in Google Drive" }, { status: 404 });
      }
    }

    // 3. Local dev - fetch from filesystem (flat keys only; nested keys are
    //    rejected above so join() can never escape UPLOAD_DIR).
    const filepath = join(UPLOAD_DIR, key);

    try {
      await stat(filepath);
    } catch {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const fileBuffer = await readFile(filepath);

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentTypeFor(key),
        "Cache-Control": "private, no-transform, max-age=3600",
      },
    });
  } catch (error) {
    console.error("File serve error:", error);
    return NextResponse.json(
      { error: "Failed to serve file" },
      { status: 500 }
    );
  }
}
