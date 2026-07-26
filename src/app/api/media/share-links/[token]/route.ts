import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { mediaShareLinks, mediaAssets, mediaFolders } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { checkRateLimit, extractIp, rateLimitResponse } from "@/lib/api/rate-limit";
import { verifyPassword } from "@/lib/auth";

const LOCKOUT_ATTEMPT_THRESHOLD = 10;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const MAX_DEPTH = 10;

/**
 * Verify that subfolderId is a proven descendant of rootFolderId
 * by walking parentId up to MAX_DEPTH. Returns breadcrumbs array or null.
 */
async function verifyDescendantAndBuildBreadcrumbs(
  rootFolderId: string,
  targetFolderId: string
): Promise<Array<{ id: string; name: string }> | null> {
  let currentId: string | null = targetFolderId;
  const path: Array<{ id: string; name: string }> = [];
  const visited = new Set<string>();
  let depth = 0;

  while (currentId && depth < MAX_DEPTH) {
    if (visited.has(currentId)) return null; // Circular reference loop guard
    visited.add(currentId);

    const folder = await db
      .select({ id: mediaFolders.id, name: mediaFolders.name, parentId: mediaFolders.parentId })
      .from(mediaFolders)
      .where(eq(mediaFolders.id, currentId))
      .get();

    if (!folder) return null;

    path.unshift({ id: folder.id, name: folder.name });

    if (currentId === rootFolderId) {
      return path; // Successfully reached share root
    }

    currentId = folder.parentId;
    depth++;
  }

  return null; // Exceeded depth or never reached rootFolderId
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const ip = extractIp(req);
    const rl = checkRateLimit(ip, "read");
    if (!rl.allowed) return rateLimitResponse(rl.resetMs);

    const { token } = await context.params;

    const link = await db
      .select()
      .from(mediaShareLinks)
      .where(eq(mediaShareLinks.token, token))
      .get();

    if (!link || !link.isActive) {
      return NextResponse.json({ error: "Invalid or inactive share link" }, { status: 404 });
    }

    // Expiry check
    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      return NextResponse.json({ error: "Share link has expired" }, { status: 410 });
    }

    // Per-token lockout check (DB-backed)
    if (link.lockedUntil && new Date(link.lockedUntil) > new Date()) {
      const retryAfter = Math.ceil(
        (new Date(link.lockedUntil).getTime() - Date.now()) / 1000
      );
      return NextResponse.json(
        { error: "Too many failed attempts. Try again later." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }

    // Password validation / cookie check
    let passwordSetCookie = false;
    if (link.passwordHash) {
      const url = new URL(req.url);
      const queryPassword = url.searchParams.get("password");

      // Check cookie for session handoff
      const cookieName = `share_auth_${token}`;
      const hasValidCookie = req.cookies.get(cookieName)?.value === "true";

      if (!queryPassword && !hasValidCookie) {
        return NextResponse.json(
          { error: "Password required", requiresPassword: true },
          { status: 401 }
        );
      }

      if (queryPassword) {
        const valid = await verifyPassword(queryPassword, link.passwordHash);
        if (!valid) {
          const newAttempts = (link.failedAttempts ?? 0) + 1;
          const lockedUntil =
            newAttempts >= LOCKOUT_ATTEMPT_THRESHOLD
              ? new Date(Date.now() + LOCKOUT_DURATION_MS).toISOString()
              : null;

          await db.update(mediaShareLinks)
            .set({
              failedAttempts: sql`${mediaShareLinks.failedAttempts} + 1`,
              ...(lockedUntil ? { lockedUntil } : {}),
            })
            .where(eq(mediaShareLinks.id, link.id))
            .run();

          return NextResponse.json({ error: "Invalid password" }, { status: 401 });
        }

        // Reset lockout state on successful authentication
        await db.update(mediaShareLinks)
          .set({ failedAttempts: 0, lockedUntil: null })
          .where(eq(mediaShareLinks.id, link.id))
          .run();

        passwordSetCookie = true;
      }
    }

    // ── Single Asset Share ───────────────────────────────────────────────────
    if (link.assetId) {
      const asset = await db
        .select()
        .from(mediaAssets)
        .where(eq(mediaAssets.id, link.assetId))
        .get();

      if (!asset) {
        return NextResponse.json({ error: "Asset not found" }, { status: 404 });
      }

      if (asset.status !== "ready") {
        return NextResponse.json(
          { error: "Asset is still processing and cannot be downloaded yet" },
          { status: 409 }
        );
      }

      let downloadUrl = asset.fileUrl;
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (supabaseUrl && serviceKey) {
        const storagePath = asset.fileUrl.replace(/^\/api\/upload\/files\//, "");
        const signRes = await fetch(
          `${supabaseUrl}/storage/v1/object/sign/uploads/${storagePath}?download=${encodeURIComponent(asset.name)}`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${serviceKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ expiresIn: 3600 }),
          }
        );

        if (signRes.ok) {
          const data = await signRes.json() as { signedUrl?: string };
          if (data.signedUrl) downloadUrl = data.signedUrl;
        }
      }

      await db.update(mediaShareLinks)
        .set({ downloadCount: sql`${mediaShareLinks.downloadCount} + 1` })
        .where(eq(mediaShareLinks.id, link.id))
        .run();

      await db.update(mediaAssets)
        .set({ downloadCount: sql`${mediaAssets.downloadCount} + 1` })
        .where(eq(mediaAssets.id, link.assetId))
        .run();

      const response = NextResponse.json({
        type: "asset",
        asset: {
          id: asset.id,
          name: asset.name,
          mimeType: asset.mimeType,
          fileType: asset.fileType,
          fileSize: asset.fileSize,
          thumbnailUrl: asset.thumbnailUrl,
        },
        downloadUrl,
      });

      if (passwordSetCookie) {
        // Path=/api/media ensures cookie is attached to both share routes and batch-download
        response.cookies.set(`share_auth_${token}`, "true", {
          path: "/api/media",
          httpOnly: true,
          sameSite: "strict",
          secure: process.env.NODE_ENV === "production",
          maxAge: 3600,
        });
      }

      return response;
    }

    // ── Folder Share ─────────────────────────────────────────────────────────
    if (!link.folderId) {
      return NextResponse.json({ error: "Share link has no asset or folder" }, { status: 400 });
    }

    const url = new URL(req.url);
    const subfolderParam = url.searchParams.get("subfolderId");
    const activeFolderId = subfolderParam || link.folderId;

    // Verify directory traversal: activeFolderId must be a proven descendant of link.folderId
    const breadcrumbs = await verifyDescendantAndBuildBreadcrumbs(link.folderId, activeFolderId);
    if (!breadcrumbs) {
      return NextResponse.json({ error: "Access denied: target folder is outside share root" }, { status: 403 });
    }

    // Fetch active folder info
    const activeFolder = await db
      .select({ id: mediaFolders.id, name: mediaFolders.name })
      .from(mediaFolders)
      .where(eq(mediaFolders.id, activeFolderId))
      .get();

    if (!activeFolder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    // Query subfolders
    const subfolders = await db
      .select({ id: mediaFolders.id, name: mediaFolders.name, createdAt: mediaFolders.createdAt })
      .from(mediaFolders)
      .where(eq(mediaFolders.parentId, activeFolderId))
      .all();

    // Query child assets (only status = 'ready')
    const childAssets = await db
      .select({
        id: mediaAssets.id,
        name: mediaAssets.name,
        mimeType: mediaAssets.mimeType,
        fileType: mediaAssets.fileType,
        fileSize: mediaAssets.fileSize,
        thumbnailUrl: mediaAssets.thumbnailUrl,
        fileUrl: mediaAssets.fileUrl,
        createdAt: mediaAssets.createdAt,
      })
      .from(mediaAssets)
      .where(eq(mediaAssets.folderId, activeFolderId))
      .all();

    // Filter only ready assets
    const readyAssets = childAssets.filter(a => a.fileUrl);

    const response = NextResponse.json({
      type: "folder",
      folder: {
        id: activeFolder.id,
        name: activeFolder.name,
        breadcrumbs,
      },
      subfolders,
      assets: readyAssets,
    });

    if (passwordSetCookie) {
      response.cookies.set(`share_auth_${token}`, "true", {
        path: "/api/media",
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
        maxAge: 3600,
      });
    }

    return response;

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to access share link";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
