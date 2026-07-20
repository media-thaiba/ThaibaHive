import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { requireAuth } from "@/lib/api/auth-guard";
import {
  isStorageConfigured,
  uploadToSupabase,
  checkStorageConfig,
} from "@/lib/storage";

export const runtime = "nodejs";

const UPLOAD_DIR = join(process.cwd(), "uploads", "chat");
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "audio/webm",
  "audio/ogg",
  "audio/wav",
  "audio/mpeg",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);

export const POST = requireAuth(async (request: Request) => {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File size exceeds limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: `File type "${file.type}" is not allowed` },
        { status: 400 }
      );
    }

    const rawExt = file.name.split(".").pop() || "bin";
    const ext = rawExt.replace(/[^a-zA-Z0-9]/g, "");
    const filename = `${randomUUID()}.${ext || "bin"}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    let fileUrl = "";

    if (isStorageConfigured) {
      fileUrl = await uploadToSupabase(
        `chat/${filename}`,
        file.type,
        buffer
      );
    } else {
      checkStorageConfig();
      const filepath = join(UPLOAD_DIR, filename);
      await mkdir(UPLOAD_DIR, { recursive: true });
      await writeFile(filepath, buffer);
      fileUrl = `/api/upload/files/chat/${filename}`;
    }

    return NextResponse.json(
      {
        url: fileUrl,
        filename: file.name,
        size: file.size,
        type: file.type,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Chat upload error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to upload file";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
