import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { mediaShareLinks, mediaAssets } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { checkRateLimit, extractIp, rateLimitResponse } from "@/lib/api/rate-limit";
import { verifyPassword } from "@/lib/auth";

const LOCKOUT_ATTEMPT_THRESHOLD = 10;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

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

    // Per-token lockout check (DB-backed — safe under multi-instance serverless)
    if (link.lockedUntil && new Date(link.lockedUntil) > new Date()) {
      const retryAfter = Math.ceil(
        (new Date(link.lockedUntil).getTime() - Date.now()) / 1000
      );
      return NextResponse.json(
        { error: "Too many failed attempts. Try again later." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }

    // Password validation
    if (link.passwordHash) {
      const url = new URL(req.url);
      const password = url.searchParams.get("password");

      if (!password) {
        return NextResponse.json(
          { error: "Password required", requiresPassword: true },
          { status: 401 }
        );
      }

      const valid = await verifyPassword(password, link.passwordHash);
      if (!valid) {
        const newAttempts = (link.failedAttempts ?? 0) + 1;
        const lockedUntil =
          newAttempts >= LOCKOUT_ATTEMPT_THRESHOLD
            ? new Date(Date.now() + LOCKOUT_DURATION_MS).toISOString()
            : null;

        // Atomic increment of failedAttempts
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
    }

    // Folder shares deferred to MD3
    if (!link.assetId) {
      return NextResponse.json(
        { error: "Folder share links are not yet supported" },
        { status: 501 }
      );
    }

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

    // Generate a short-lived signed download URL with Content-Disposition: attachment
    let downloadUrl = asset.fileUrl;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && serviceKey) {
      const storagePath = asset.fileUrl.replace(/^\/api\/upload\/files\//, "");
      // Supabase ?download=filename sets Content-Disposition: attachment; filename="..."
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

    // Atomic download count increments — SET col = col + 1 to avoid race conditions
    await db.update(mediaShareLinks)
      .set({ downloadCount: sql`${mediaShareLinks.downloadCount} + 1` })
      .where(eq(mediaShareLinks.id, link.id))
      .run();

    await db.update(mediaAssets)
      .set({ downloadCount: sql`${mediaAssets.downloadCount} + 1` })
      .where(eq(mediaAssets.id, link.assetId))
      .run();

    return NextResponse.json({
      asset: {
        name: asset.name,
        mimeType: asset.mimeType,
        fileType: asset.fileType,
        fileSize: asset.fileSize,
        thumbnailUrl: asset.thumbnailUrl,
      },
      downloadUrl,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to access share link";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
