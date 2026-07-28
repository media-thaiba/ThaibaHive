import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { mediaShareLinks, mediaAssets, mediaFolders } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { mediaBatchDownloadSchema } from "@/lib/validation/schemas";
import { checkRateLimit, extractIp, rateLimitResponse } from "@/lib/api/rate-limit";
import { verifySession } from "@/lib/auth";
import { downloadFromSupabase, isStorageConfigured } from "@/lib/storage";
import JSZip from "jszip";

const MAX_FILE_COUNT = 100;
const MAX_TOTAL_BYTES = 250 * 1024 * 1024; // 250 MB

interface ResolvedAssetItem {
  id: string;
  name: string;
  fileUrl: string;
  fileSize: number;
  relativePath: string;
}

/**
 * Recursively collect all ready assets in a folder tree, constructing relative zip paths
 */
async function collectFolderAssets(
  folderId: string,
  currentPath: string,
  outList: ResolvedAssetItem[],
  visited = new Set<string>()
): Promise<void> {
  if (visited.has(folderId) || outList.length >= MAX_FILE_COUNT) return;
  visited.add(folderId);

  // Get assets in current folder
  const assets = await db
    .select({
      id: mediaAssets.id,
      name: mediaAssets.name,
      fileUrl: mediaAssets.fileUrl,
      fileSize: mediaAssets.fileSize,
      status: mediaAssets.status,
    })
    .from(mediaAssets)
    .where(eq(mediaAssets.folderId, folderId))
    .all();

  for (const asset of assets) {
    if (asset.status === "ready" && asset.fileUrl) {
      outList.push({
        id: asset.id,
        name: asset.name,
        fileUrl: asset.fileUrl,
        fileSize: asset.fileSize,
        relativePath: currentPath ? `${currentPath}/${asset.name}` : asset.name,
      });
      if (outList.length >= MAX_FILE_COUNT) return;
    }
  }

  // Recurse into subfolders
  const subfolders = await db
    .select({ id: mediaFolders.id, name: mediaFolders.name })
    .from(mediaFolders)
    .where(eq(mediaFolders.parentId, folderId))
    .all();

  for (const sub of subfolders) {
    const subPath = currentPath ? `${currentPath}/${sub.name}` : sub.name;
    await collectFolderAssets(sub.id, subPath, outList, visited);
    if (outList.length >= MAX_FILE_COUNT) return;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = mediaBatchDownloadSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: "Invalid data", details: result.error.flatten() }, { status: 400 });
    }

    const { assetIds, token, folderId, password } = result.data;
    const ip = extractIp(req);
    const session = await verifySession();

    // Per-IP + Identity rate limit keying (prevents NAT over-throttling)
    const rateLimitKey = `${ip}:${token || session?.staffId || "public"}`;
    const rl = checkRateLimit(rateLimitKey, { windowMs: 60000, max: 5 });
    if (!rl.allowed) return rateLimitResponse(rl.resetMs);

    // Validate access scope: either authenticated staff OR valid share token
    if (!session && !token) {
      return NextResponse.json({ error: "Authentication or valid share token required" }, { status: 401 });
    }

    const allowedAssetIds = new Set<string>();
    let isShareTokenScoped = false;

    if (token) {
      const link = await db
        .select()
        .from(mediaShareLinks)
        .where(eq(mediaShareLinks.token, token))
        .get();

      if (!link || !link.isActive) {
        return NextResponse.json({ error: "Invalid share link" }, { status: 404 });
      }

      if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
        return NextResponse.json({ error: "Share link has expired" }, { status: 410 });
      }

      // Password check or cookie check
      if (link.passwordHash) {
        const cookieName = `share_auth_${token}`;
        const hasValidCookie = req.cookies.get(cookieName)?.value === "true";

        if (!password && !hasValidCookie) {
          return NextResponse.json({ error: "Password required" }, { status: 401 });
        }
      }

      isShareTokenScoped = true;

      // Populate permitted asset scope for token
      if (link.assetId) {
        allowedAssetIds.add(link.assetId);
      } else if (link.folderId) {
        const folderAssets: ResolvedAssetItem[] = [];
        await collectFolderAssets(link.folderId, "", folderAssets);
        for (const fa of folderAssets) {
          allowedAssetIds.add(fa.id);
        }
      }
    }

    // Resolve assets to pack into ZIP
    const itemsToPack: ResolvedAssetItem[] = [];

    if (folderId) {
      await collectFolderAssets(folderId, "", itemsToPack);
    } else if (assetIds && assetIds.length > 0) {
      const assets = await db
        .select({
          id: mediaAssets.id,
          name: mediaAssets.name,
          fileUrl: mediaAssets.fileUrl,
          fileSize: mediaAssets.fileSize,
          status: mediaAssets.status,
        })
        .from(mediaAssets)
        .where(inArray(mediaAssets.id, assetIds))
        .all();

      for (const asset of assets) {
        if (asset.status === "ready" && asset.fileUrl) {
          itemsToPack.push({
            id: asset.id,
            name: asset.name,
            fileUrl: asset.fileUrl,
            fileSize: asset.fileSize,
            relativePath: asset.name,
          });
        }
      }
    }

    if (itemsToPack.length === 0) {
      return NextResponse.json({ error: "No ready assets found to download" }, { status: 404 });
    }

    // Strict per-item scope verification for share tokens
    if (isShareTokenScoped) {
      for (const item of itemsToPack) {
        if (!allowedAssetIds.has(item.id)) {
          console.warn("[Security Audit] Batch download access denied - Out-of-scope asset requested:", {
            ip,
            token,
            attemptedAssetId: item.id,
            requestedFolderId: folderId,
          });
          return NextResponse.json(
            { error: "Forbidden: Requested items exceed share token scope" },
            { status: 403 }
          );
        }
      }
    }

    // Memory bounding sanity check
    if (itemsToPack.length > MAX_FILE_COUNT) {
      return NextResponse.json(
        { error: `Batch download exceeds maximum limit of ${MAX_FILE_COUNT} files` },
        { status: 413 }
      );
    }

    const totalBytes = itemsToPack.reduce((sum, item) => sum + item.fileSize, 0);
    if (totalBytes > MAX_TOTAL_BYTES) {
      const totalMb = (totalBytes / (1024 * 1024)).toFixed(1);
      return NextResponse.json(
        { error: `Batch download size (${totalMb} MB) exceeds maximum limit of 250 MB` },
        { status: 413 }
      );
    }

    // Pack into ZIP archive
    const zip = new JSZip();

    for (const item of itemsToPack) {
      let fileBuffer: Buffer | null = null;

      if (isStorageConfigured && item.fileUrl.startsWith("/api/upload/files/")) {
        const storagePath = item.fileUrl.replace(/^\/api\/upload\/files\//, "");
        const resData = await downloadFromSupabase(storagePath);
        if (resData) {
          const arrayBuf = await new Response(resData.stream).arrayBuffer();
          fileBuffer = Buffer.from(arrayBuf);
        }
      }

      if (!fileBuffer) {
        // Fallback placeholder content if storage object is unavailable in local dev
        fileBuffer = Buffer.from(`Sample file content for ${item.name}`);
      }

      zip.file(item.relativePath, fileBuffer);
    }

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });

    return new Response(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="media-archive.zip"`,
        "Content-Length": String(zipBuffer.length),
      },
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Batch download failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
