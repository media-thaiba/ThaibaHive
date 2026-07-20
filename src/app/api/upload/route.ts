import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { requireAuth } from "@/lib/api/auth-guard";
import { uploadToDrive } from "@/lib/drive";
import { isStorageConfigured, uploadToSupabase, checkStorageConfig } from "@/lib/storage";
import { checkRateLimit, extractIp, rateLimitResponse } from "@/lib/api/rate-limit";

export const runtime = "nodejs";

const UPLOAD_DIR = join(process.cwd(), "uploads");
const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
]);

export const POST = requireAuth(async (request: Request, _session) => {
  const ip = extractIp(request);
  const rl = checkRateLimit(ip, "upload");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds limit of ${MAX_FILE_SIZE / 1024 / 1024 / 1024}GB` },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: `File type "${file.type}" is not allowed` },
        { status: 400 }
      );
    }

    const ext = file.name.split(".").pop() || "bin";
    const filename = `${randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

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


    return NextResponse.json({
      url: fileUrl,
      filename: file.name,
      size: file.size,
      type: file.type,
    }, { status: 201 });
  } catch (error) {
    console.error("Upload error:", error);
    const message = error instanceof Error ? error.message : "Failed to upload file";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
});
