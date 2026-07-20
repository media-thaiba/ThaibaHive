import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { isStorageConfigured, downloadFromSupabase } from "@/lib/storage";
import { verifySession } from "@/lib/auth";

export const runtime = "nodejs";

// NOTE: Avatar files are designed to be organization-wide readable by any authenticated user.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { filename } = await params;

    // Strict validation: avatar files are <staffId>-<uuid>.<ext>. This blocks traversal (.., /, \) and injection.
    const filenameRegex = /^[a-zA-Z0-9_-]+-[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}\.[a-zA-Z0-9]+$/;
    if (!filename || !filenameRegex.test(filename)) {
      return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
    }

    if (isStorageConfigured) {
      const supabaseFile = await downloadFromSupabase(filename, "avatars");
      if (!supabaseFile) {
        return NextResponse.json({ error: "File not found in Supabase Storage" }, { status: 404 });
      }

      return new NextResponse(supabaseFile.stream, {
        headers: {
          "Content-Type": supabaseFile.mimeType,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    const filepath = join(process.cwd(), "uploads", "avatars", filename);
    const file = await readFile(filepath);


    const ext = filename.split(".").pop()?.toLowerCase();
    const contentType = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
    }[ext || ""] || "application/octet-stream";

    return new NextResponse(file, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}