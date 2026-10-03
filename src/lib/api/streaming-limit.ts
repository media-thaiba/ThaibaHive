import { NextResponse } from "next/server";

export class PayloadTooLargeError extends Error {
  constructor(maxBytes: number) {
    super(`Payload Too Large: stream exceeded maximum allowed size of ${maxBytes} bytes`);
    this.name = "PayloadTooLargeError";
  }
}

/**
 * Wraps a ReadableStream to enforce a maximum byte limit during ingestion.
 * If the byte stream exceeds maxBytes, the stream is aborted with a PayloadTooLargeError.
 */
export function createBoundedStream(
  stream: ReadableStream<Uint8Array> | null,
  maxBytes: number = 50 * 1024 * 1024 // 50MB default
): ReadableStream<Uint8Array> | null {
  if (!stream) return null;

  let totalBytes = 0;
  const reader = stream.getReader();

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
          return;
        }

        if (value) {
          totalBytes += value.byteLength;
          if (totalBytes > maxBytes) {
            const err = new PayloadTooLargeError(maxBytes);
            controller.error(err);
            await reader.cancel(err);
            return;
          }
          controller.enqueue(value);
        }
      } catch (err) {
        controller.error(err);
      }
    },
    async cancel(reason) {
      await reader.cancel(reason);
    },
  });
}

/**
 * Reads a Request body with streaming boundary enforcement (supports chunked transfers).
 */
export async function readBoundedRequestBody(
  request: Request,
  maxBytes: number = 50 * 1024 * 1024
): Promise<Uint8Array> {
  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > maxBytes) {
    throw new PayloadTooLargeError(maxBytes);
  }

  if (!request.body) {
    return new Uint8Array(0);
  }

  const bounded = createBoundedStream(request.body, maxBytes);
  if (!bounded) return new Uint8Array(0);

  const reader = bounded.getReader();
  const chunks: Uint8Array[] = [];
  let totalLength = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      totalLength += value.byteLength;
    }
  }

  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return result;
}
