import { NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import { join } from "path";
import { downloadFromDrive } from "@/lib/drive";
import { isStorageConfigured, downloadFromSupabase } from "@/lib/storage";
import { requireAuth } from "@/lib/api/auth-guard";
import { contentTypeFor, nodeStreamToWeb, validateFileKey } from "@/lib/media/serve-file-utils";

export const runtime = "nodejs";

const UPLOAD_DIR = join(process.cwd(), "uploads");

function buildSafeFileHeaders(mimeType: string, key: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": mimeType,
    "Cache-Control": "private, no-transform, max-age=3600",
    "X-Content-Type-Options": "nosniff",
  };
  const lowerMime = mimeType.toLowerCase();
  if (
    lowerMime.includes("html") ||
    lowerMime.includes("svg") ||
    lowerMime.includes("xml") ||
    lowerMime.includes("javascript")
  ) {
    const filename = key.split("/").pop() || "download";
    headers["Content-Disposition"] = `attachment; filename="${filename.replace(/[^A-Za-z0-9._-]/g, "_")}"`;
  }
  return headers;
}

export const GET = requireAuth(async (
  _request: Request,
  session,
  context?: { params: Promise<{ filename: string[] | string }> }
) => {
  try {
    const resolvedParams = context?.params ? await context.params : { filename: [] };
    const { filename } = resolvedParams;
    const segments = Array.isArray(filename) ? filename : String(filename || "").split("/");
    const key = validateFileKey(segments);
    if (!key) {
      return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
    }

    // ── Multi-Tenant Isolation & Temp Storage Gate ─────────────────────────
    if (segments.length > 1) {
      const [root, tenantSegment] = segments;
      if (root === "private_tmp" && session.role !== "super_admin") {
        return NextResponse.json({ error: "Access to temporary media denied" }, { status: 403 });
      }

      const targetInst = tenantSegment.replace(/^tenant_/, "");
      if (targetInst !== "default" && session.role !== "super_admin") {
        const callerInst = session.institutionId;
        if (!callerInst || (callerInst !== "global" && callerInst !== targetInst)) {
          return NextResponse.json(
            { error: "Forbidden: file belongs to another institution" },
            { status: 403 }
          );
        }
      }
    }

    // 1. Prioritize Supabase Storage (flat and nested keys both resolve here)
    if (isStorageConfigured) {
      const supabaseFile = await downloadFromSupabase(key, "uploads");
      if (supabaseFile) {
        return new NextResponse(supabaseFile.stream, {
          headers: buildSafeFileHeaders(supabaseFile.mimeType, key),
        });
      }
      if (segments.length > 1) {
        return NextResponse.json({ error: "File not found in Supabase Storage" }, { status: 404 });
      }
    }

    // 2. Production check - fetch from Google Drive (flat keys only)
    if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
      const driveFile = await downloadFromDrive(key);
      if (driveFile) {
        return new NextResponse(nodeStreamToWeb(driveFile.stream), {
          headers: buildSafeFileHeaders(driveFile.mimeType, key),
        });
      }
      if (segments.length > 1) {
        return NextResponse.json({ error: "File not found in Google Drive" }, { status: 404 });
      }
    }

    // 3. Local dev - fetch from filesystem (flat keys only)
    const filepath = join(UPLOAD_DIR, key);

    try {
      await stat(filepath);
    } catch {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const fileBuffer = await readFile(filepath);

    return new NextResponse(fileBuffer, {
      headers: buildSafeFileHeaders(contentTypeFor(key), key),
    });
  } catch (error) {
    console.error("File serve error:", error);
    return NextResponse.json(
      { error: "Failed to serve file" },
      { status: 500 }
    );
  }
});
