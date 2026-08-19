import zlib from "zlib";
import { promisify } from "util";

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);
const brotliCompress = promisify(zlib.brotliCompress);
const brotliDecompress = promisify(zlib.brotliDecompress);

/**
 * Compresses an object payload using gzip or brotli.
 * Defaults to gzip. Accepts custom compression levels.
 */
export async function compressPayload(
  data: object,
  method: "gzip" | "brotli" = "gzip",
  level?: number
): Promise<Buffer> {
  if (data === null || data === undefined) {
    throw new Error("[Compression] Cannot compress null or undefined payload");
  }

  const jsonString = JSON.stringify(data);
  const buffer = Buffer.from(jsonString, "utf-8");

  try {
    if (method === "brotli") {
      const options = level !== undefined ? { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: level } } : {};
      return await brotliCompress(buffer, options);
    } else {
      const options = level !== undefined ? { level } : { level: zlib.constants.Z_BEST_SPEED }; // default level 1 or best speed for low CPU overhead
      return await gzip(buffer, options);
    }
  } catch (err) {
    console.error(`[Compression] Failed to compress payload using ${method}:`, err);
    throw err;
  }
}

/**
 * Decompresses a Buffer into a JSON object.
 * Detects format automatically. Falls back to raw string parsing if compression is absent.
 */
export async function decompressPayload(
  buffer: Buffer | string,
  method: "gzip" | "brotli" | "auto" = "auto"
): Promise<any> {
  if (!buffer) {
    return null;
  }

  // Handle case where input is a raw JSON string (not compressed)
  if (typeof buffer === "string") {
    try {
      return JSON.parse(buffer);
    } catch {
      return buffer;
    }
  }

  try {
    // Detect gzip signature (0x1f 0x8b)
    const isGzip = buffer[0] === 0x1f && buffer[1] === 0x8b;
    
    let decompressed: Buffer;

    if (method === "gzip" || (method === "auto" && isGzip)) {
      decompressed = await gunzip(buffer);
    } else if (method === "brotli" || method === "auto") {
      try {
        decompressed = await brotliDecompress(buffer);
      } catch (err) {
        // If auto and brotli failed, try checking if it's just raw JSON
        if (method === "auto") {
          const rawStr = buffer.toString("utf-8");
          try {
            return JSON.parse(rawStr);
          } catch {
            // ignore and rethrow original brotli decompress error
          }
        }
        throw err;
      }
    } else {
      // Fallback
      decompressed = buffer;
    }

    const rawString = decompressed.toString("utf-8");
    return JSON.parse(rawString);
  } catch (err) {
    // Fallback if data is actually raw JSON in a buffer
    try {
      const rawString = buffer.toString("utf-8");
      return JSON.parse(rawString);
    } catch {
      console.error("[Compression] Decompression failed and raw parsing fallback failed:", err);
      throw err;
    }
  }
}

/**
 * Creates a Web TransformStream that compresses incoming text/binary chunks using Gzip
 * and immediately flushes the compressed output chunk-by-chunk to prevent buffering.
 */
export function createGzipFlushStream(): TransformStream<any, any> {
  const gzipStream = zlib.createGzip({ flush: zlib.constants.Z_SYNC_FLUSH });

  return new TransformStream({
    start(controller) {
      gzipStream.on("data", (chunk) => {
        controller.enqueue(chunk);
      });
      gzipStream.on("error", (err) => {
        controller.error(err);
      });
    },
    transform(chunk) {
      gzipStream.write(chunk);
    },
    flush() {
      gzipStream.end();
    }
  });
}

