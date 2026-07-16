import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { requireAuth } from "@/lib/api/auth-guard";
import { db } from "@/db";
import { staff } from "@/db/schema";
import { eq } from "drizzle-orm";

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

    const ext = file.name.split(".").pop() || "bin";
    const filename = `${session.staffId}-${randomUUID()}.${ext}`;
    const filepath = join(UPLOAD_DIR, filename);

    await mkdir(UPLOAD_DIR, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, buffer);

    const fileUrl = `/api/upload/files/avatars/${filename}`;

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
});