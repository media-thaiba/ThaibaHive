import { NextResponse } from "next/server";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { isAbsolute, resolve, sep } from "path";
import { verifySession } from "@/lib/auth";
import { contentTypeFor, nodeStreamToWeb } from "@/lib/media/serve-file-utils";

export const runtime = "nodejs";

const SAFE_SEGMENT = /^[A-Za-z0-9._:-]+$/;

/**
 * Serve NAS-backed assets (`nas://{absolutePath}` file URLs).
 * Self-host only: roots come from NAS_ROOT_PATHS (path.delimiter-separated).
 * Not configured (e.g. Vercel) → always 404, inert by design.
 *
 * D9*: previously `nas://` file URLs rendered as dead links. Every request is
 * session-authenticated and the resolved path must be contained in one of the
 * configured NAS roots — `..`, backslash tricks, and drive-escape are blocked
 * by resolve + prefix containment.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const roots = (process.env.NAS_ROOT_PATHS || "")
      .split(process.platform === "win32" ? ";" : ":")
      .map((p) => p.trim())
      .filter(Boolean);
    if (roots.length === 0) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const { path: rawSegments } = await params;
    if (!rawSegments?.length || rawSegments.length > 32) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    // Rebuild the absolute path (handles both `nas://D:/x` and `nas:///srv/x`,
    // plus Windows backslash URLs) before segment validation.
    const rawPath = rawSegments.join("/").replace(/\\/g, "/");
    const segments = rawPath.split("/").filter(Boolean);
    if (!segments.length || segments.some((s) => !SAFE_SEGMENT.test(s) || s === "." || s === "..")) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    let filePath: string | null = null;
    for (const rootRaw of roots) {
      const root = resolve(rootRaw);
      const candidate = isAbsolute(rawPath)
        ? resolve(rawPath)
        : resolve(root, rawPath);
      const contained = candidate === root || candidate.startsWith(root + sep);
      if (!contained) continue;
      try {
        const info = await stat(candidate);
        if (info.isFile()) {
          filePath = candidate;
          break;
        }
      } catch {
        /* try next root */
      }
    }

    if (!filePath) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const stream = createReadStream(filePath);
    return new NextResponse(nodeStreamToWeb(stream), {
      headers: {
        "Content-Type": contentTypeFor(filePath),
        "Cache-Control": "private, no-transform, max-age=3600",
      },
    });
  } catch (error) {
    console.error("NAS file serve error:", error);
    return NextResponse.json({ error: "Failed to serve file" }, { status: 500 });
  }
}
