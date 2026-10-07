import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { createHash, randomUUID } from "crypto";
import { requireAuth } from "@/lib/api/auth-guard";
import { resolveScopedInstitutionId } from "@/lib/auth";
import { uploadToDrive } from "@/lib/drive";
import { isStorageConfigured, uploadToSupabase, checkStorageConfig } from "@/lib/storage";
import { checkRateLimit, extractIp, rateLimitResponse } from "@/lib/api/rate-limit";
import { db } from "@/db";
import { mediaAssets } from "@/db/schema";

export const runtime = "nodejs";

const UPLOAD_DIR = join(process.cwd(), "uploads");
const MAX_FILE_SIZE = 4.5 * 1024 * 1024; // 4.5MB Vercel serverless request body limit
const MIME_TO_EXTENSIONS: Record<string, string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/gif": ["gif"],
  "image/webp": ["webp"],
  "application/pdf": ["pdf"],
  "application/msword": ["doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"],
  "application/vnd.ms-excel": ["xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ["xlsx"],
  "text/plain": ["txt", "csv", "log", "md"],
};

const ALLOWED_TYPES = new Set(Object.keys(MIME_TO_EXTENSIONS));

function fileTypeFromMime(mime: string): "image" | "video" | "audio" | "document" {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return "document";
}

const UUID_RE = /^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/;
const SHA256_RE = /^[a-f0-9]{64}$/i;

export const POST = requireAuth(async (request: Request, session) => {
  const ip = extractIp(request);
  const rl = checkRateLimit(ip, "upload");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const declaredSha256Raw = formData.get("sha256");
    const clientEventIdRaw = formData.get("clientEventId");
    const declaredSha256 =
      typeof declaredSha256Raw === "string" && declaredSha256Raw ? declaredSha256Raw : null;
    const clientEventId =
      typeof clientEventIdRaw === "string" && clientEventIdRaw ? clientEventIdRaw : null;

    if (declaredSha256 && !SHA256_RE.test(declaredSha256)) {
      return NextResponse.json({ error: "Invalid sha256 digest" }, { status: 400 });
    }
    if (clientEventId && !UUID_RE.test(clientEventId)) {
      return NextResponse.json({ error: "Invalid clientEventId" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: "File size exceeds 4.5 MB serverless proxy limit. For larger assets, generate a direct Supabase signed upload URL via /api/media/upload/sign.",
        },
        { status: 413 }
      );
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: `File type "${file.type}" is not allowed` },
        { status: 400 }
      );
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const expectedExtensions = MIME_TO_EXTENSIONS[file.type];
    if (!expectedExtensions || !expectedExtensions.includes(ext)) {
      return NextResponse.json(
        { error: `File extension ".${ext}" does not match declared file type "${file.type}"` },
        { status: 400 }
      );
    }

    const filename = `${randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    // D2*: end-to-end integrity — when the client declares a digest, verify
    // the received bytes before anything is stored.
    if (declaredSha256) {
      const actualHash = createHash("sha256").update(buffer).digest("hex");
      if (actualHash !== declaredSha256.toLowerCase()) {
        return NextResponse.json({ error: "checksum_mismatch" }, { status: 422 });
      }
    }

    let fileUrl = "";

    // Prioritize Supabase Storage
    if (isStorageConfigured) {
      fileUrl = await uploadToSupabase(filename, file.type, buffer);
    } else if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
      await uploadToDrive(filename, file.type, buffer);
      fileUrl = `/api/upload/files/${filename}`;
    } else {
      // Local dev check - store in filesystem (ensure production fails if not configured)
      checkStorageConfig();
      const filepath = join(UPLOAD_DIR, filename);
      await mkdir(UPLOAD_DIR, { recursive: true });
      await writeFile(filepath, buffer);
      fileUrl = `/api/upload/files/${filename}`;
    }

    // Asset-row creation happens ONLY for media-queue clients (clientEventId
    // present). Web callers (circulars/finance/avatar) keep the legacy
    // URL-only contract — no gallery flood, no double rows.
    let asset: unknown = null;
    if (clientEventId) {
      const scopedInstitutionId = await resolveScopedInstitutionId(session.institutionId);
      const institutionId =
        scopedInstitutionId && scopedInstitutionId !== "global" ? scopedInstitutionId : null;
      const now = new Date().toISOString();
      asset = await db
        .insert(mediaAssets)
        .values({
          id: randomUUID(),
          name: file.name,
          fileUrl,
          fileSize: file.size,
          mimeType: file.type,
          fileType: fileTypeFromMime(file.type),
          status: "ready",
          metadata: {
            clientEventId,
            verified: !!declaredSha256,
            mode: "multipart",
            ...(declaredSha256 ? { sha256: declaredSha256.toLowerCase() } : {}),
          },
          createdById: session.staffId,
          institutionId,
          createdAt: now,
          updatedAt: now,
        })
        .returning()
        .get();
    }

    return NextResponse.json({
      url: fileUrl,
      filename: file.name,
      size: file.size,
      type: file.type,
      ...(asset ? { asset } : {}),
    }, { status: 201 });
  } catch (error) {
    console.error("Upload error:", error);
    const message = error instanceof Error ? error.message : "Failed to upload file";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}, "media:create");
