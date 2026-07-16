import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { stat } from "fs/promises";
import { downloadFromDrive } from "@/lib/drive";
import { Readable } from "stream";

export const runtime = "nodejs";

const UPLOAD_DIR = join(process.cwd(), "uploads");

const MIME_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  txt: "text/plain",
};

// Helper to convert Node stream to Web ReadableStream
function nodeStreamToWeb(nodeStream: any): ReadableStream {
  return new ReadableStream({
    start(controller) {
      nodeStream.on("data", (chunk: any) => {
        controller.enqueue(chunk);
      });
      nodeStream.on("end", () => {
        controller.close();
      });
      nodeStream.on("error", (err: any) => {
        controller.error(err);
      });
    },
    cancel() {
      nodeStream.destroy();
    }
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    if (!filename || filename.includes("..") || filename.includes("/")) {
      return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
    }

    // 1. Production check - fetch from Google Drive
    if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
      const driveFile = await downloadFromDrive(filename);
      if (!driveFile) {
        return NextResponse.json({ error: "File not found in Google Drive" }, { status: 404 });
      }

      const webStream = nodeStreamToWeb(driveFile.stream);

      return new NextResponse(webStream, {
        headers: {
          "Content-Type": driveFile.mimeType,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    // 2. Local dev check - fetch from filesystem
    const filepath = join(UPLOAD_DIR, filename);

    try {
      await stat(filepath);
    } catch {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const fileBuffer = await readFile(filepath);
    const ext = filename.split(".").pop()?.toLowerCase() || "";
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("File serve error:", error);
    return NextResponse.json(
      { error: "Failed to serve file" },
      { status: 500 }
    );
  }
}
