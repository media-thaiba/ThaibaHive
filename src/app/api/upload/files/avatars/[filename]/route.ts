import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { isStorageConfigured, downloadFromSupabase } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

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