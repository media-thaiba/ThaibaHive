import { NextResponse } from "next/server";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { isAbsolute, resolve, sep } from "path";
import { requireAuth } from "@/lib/api/auth-guard";
import { contentTypeFor, nodeStreamToWeb } from "@/lib/media/serve-file-utils";

export const runtime = "nodejs";

const SAFE_SEGMENT = /^[A-Za-z0-9._:-]+$/;

/**
 * Serve NAS-backed assets (`nas://{absolutePath}` file URLs).
 * Self-host only: roots come from NAS_ROOT_PATHS (path.delimiter-separated).
 * Not configured (e.g. Vercel) → always 404, inert by design.
 */
export const GET = requireAuth(async (
  _request: Request,
  session,
  context?: { params: Promise<{ path: string[] }> }
) => {
  try {
    const roots = (process.env.NAS_ROOT_PATHS || "")
      .split(process.platform === "win32" ? ";" : ":")
      .map((p) => p.trim())
      .filter(Boolean);
    if (roots.length === 0) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const resolvedParams = context?.params ? await context.params : { path: [] };
    const { path: rawSegments } = resolvedParams;
    if (!rawSegments?.length || rawSegments.length > 32) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    const rawPath = rawSegments.join("/").replace(/\\/g, "/");
    const segments = rawPath.split("/").filter(Boolean);
    if (!segments.length || segments.some((s) => !SAFE_SEGMENT.test(s) || s === "." || s === "..")) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    // Enforce tenant segment isolation when path contains a tenant_<id> folder
    const tenantSegment = segments.find((s) => s.startsWith("tenant_"));
    if (tenantSegment && session.role !== "super_admin") {
      const targetInst = tenantSegment.replace(/^tenant_/, "");
      const callerInst = session.institutionId;
      if (targetInst !== "default" && (!callerInst || (callerInst !== "global" && callerInst !== targetInst))) {
        return NextResponse.json(
          { error: "Forbidden: NAS path belongs to another institution" },
          { status: 403 }
        );
      }
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
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("NAS file serve error:", error);
    return NextResponse.json({ error: "Failed to serve file" }, { status: 500 });
  }
}, "media:read");
