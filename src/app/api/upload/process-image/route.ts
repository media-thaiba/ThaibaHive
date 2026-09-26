/**
 * Image Processing Pipeline
 * Task P3-83: Resize and convert avatar/image uploads to WebP
 *
 * POST /api/upload/process-image
 * - Accepts multipart/form-data with 'file' field
 * - Resizes to max 512x512 (avatar) or 1920x1080 (banner)
 * - Converts to WebP format for bandwidth optimization
 * - Requires authentication
 *
 * Note: Requires sharp package:
 *   pnpm add sharp
 */
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";

const MAX_AVATAR_SIZE = 512;
const MAX_BANNER_WIDTH = 1920;
const MAX_BANNER_HEIGHT = 1080;
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB input limit

async function getSharp() {
  try {
     
    // @ts-expect-error sharp is optional — install with: pnpm add sharp
    const sharp = await import("sharp");
    return sharp.default as (input: Buffer) => {
      resize: (w: number, h: number, opts?: object) => ReturnType<typeof _getSharpInstance>;
      webp: (opts?: object) => ReturnType<typeof _getSharpInstance>;
      toBuffer: () => Promise<Buffer>;
      metadata: () => Promise<{ format?: string }>;
    };
  } catch {
    return null;
  }
}

function _getSharpInstance(): any { return null; }

export const POST = requireAuth(async (request: Request) => {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const mode = (formData.get("mode") as string) || "avatar";

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "File must be an image" }, { status: 400 });
  }

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "File exceeds 10MB limit" }, { status: 413 });
  }

  const sharp = await getSharp();
  if (!sharp) {
    return NextResponse.json(
      { error: "Image processing unavailable. Install sharp: pnpm add sharp" },
      { status: 503 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const isAvatar = mode === "avatar";

  const processed = await sharp(buffer)
    .resize(
      isAvatar ? MAX_AVATAR_SIZE : MAX_BANNER_WIDTH,
      isAvatar ? MAX_AVATAR_SIZE : MAX_BANNER_HEIGHT,
      { fit: isAvatar ? "cover" : "inside", withoutEnlargement: true }
    )
    .webp({ quality: 82 })
    .toBuffer();

  const metadata = await sharp(buffer).metadata();

  return new Response(processed, {
    status: 200,
    headers: {
      "Content-Type": "image/webp",
      "Content-Length": processed.length.toString(),
      "X-Original-Format": metadata.format || "unknown",
      "X-Original-Size": file.size.toString(),
      "X-Processed-Size": processed.length.toString(),
      "Cache-Control": "no-store",
    },
  });
}, "profile:write");
