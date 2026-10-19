import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { requireAuth } from "@/lib/api/auth-guard";
import { db } from "@/db";
import { staff } from "@/db/schema";
import { eq } from "drizzle-orm";

import { isStorageConfigured, uploadToSupabase, checkStorageConfig } from "@/lib/storage";

export const runtime = "nodejs";

const UPLOAD_DIR = join(process.cwd(), "uploads", "avatars");
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

export const POST = requireAuth(async (request: Request, session) => {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds limit of ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: `File type "${file.type}" is not allowed. Only JPEG, PNG, GIF, WebP.` },
        { status: 400 }
      );
    }

    const rawExt = file.name.split(".").pop()?.toLowerCase() || "png";
    const ext = rawExt.replace(/[^a-z0-9]/g, "") || "png";
    const filename = `${session.staffId}-${randomUUID()}.${ext}`;
    const rawBuffer = Buffer.from(await file.arrayBuffer());

    // ── Privacy & Security: Strip EXIF / GPS Metadata via Sharp ───────────
    let buffer = rawBuffer;
    try {
      const sharpModule = await import("sharp");
      const sharp = sharpModule.default;
      if (file.type === "image/jpeg" || file.type === "image/jpg") {
        buffer = await sharp(rawBuffer).rotate().jpeg({ quality: 85 }).toBuffer();
      } else if (file.type === "image/png") {
        buffer = await sharp(rawBuffer).png({ compressionLevel: 8 }).toBuffer();
      } else if (file.type === "image/webp") {
        buffer = await sharp(rawBuffer).rotate().webp({ quality: 85 }).toBuffer();
      }
    } catch {
      // Fallback: use rawBuffer if sharp is unavailable in testing/mocked runtime
      buffer = rawBuffer;
    }

    let fileUrl = "";

    if (isStorageConfigured) {
      fileUrl = await uploadToSupabase(filename, file.type, buffer, "avatars");
    } else {
      checkStorageConfig();
      const filepath = join(UPLOAD_DIR, filename);
      await mkdir(UPLOAD_DIR, { recursive: true });
      await writeFile(filepath, buffer);
      fileUrl = `/api/upload/files/avatars/${filename}`;
    }

    await db.update(staff).set({ avatarUrl: fileUrl }).where(eq(staff.id, session.staffId)).run();

    return NextResponse.json({
      url: fileUrl,
      filename: file.name,
      size: file.size,
      type: file.type,
    }, { status: 201 });
  } catch (error) {
    console.error("Avatar upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload avatar" },
      { status: 500 }
    );
  }
}, "media:create");