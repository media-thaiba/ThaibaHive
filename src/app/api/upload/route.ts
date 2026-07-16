import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { requireAuth } from "@/lib/api/auth-guard";
import { uploadToDrive } from "@/lib/drive";

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

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 10;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

export const POST = requireAuth(async (request: Request, session) => {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many upload requests. Please try again later." },
      { status: 429 }
    );
  }

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

    // Production check - stream to Google Drive
    if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
      const driveFileId = await uploadToDrive(filename, file.type, buffer);
      if (!driveFileId) {
        throw new Error("Failed to store file in Google Drive");
      }
      fileUrl = `/api/upload/files/${filename}`;
    } else {
      // Local dev check - store in filesystem
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
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
});
