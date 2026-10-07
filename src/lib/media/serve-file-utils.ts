import type { Readable } from "stream";

export const SERVE_MIME_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  bmp: "image/bmp",
  mp4: "video/mp4",
  webm: "video/webm",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  txt: "text/plain",
};

export function contentTypeFor(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return SERVE_MIME_TYPES[ext] || "application/octet-stream";
}

// Helper to convert Node stream (or web stream) to Web ReadableStream
export function nodeStreamToWeb(nodeStream: NodeJS.ReadableStream | Readable): ReadableStream {
  if (typeof (nodeStream as unknown as ReadableStream).getReader === "function") {
    return nodeStream as unknown as ReadableStream;
  }
  return new ReadableStream({
    start(controller) {
      nodeStream.on("data", (chunk: Buffer | string) => {
        controller.enqueue(typeof chunk === "string" ? new TextEncoder().encode(chunk) : chunk);
      });
      nodeStream.on("end", () => {
        controller.close();
      });
      nodeStream.on("error", (err: Error) => {
        controller.error(err);
      });
    },
    cancel() {
      const destroyable = nodeStream as Partial<Readable>;
      if (typeof destroyable.destroy === "function") {
        destroyable.destroy();
      }
    },
  });
}
