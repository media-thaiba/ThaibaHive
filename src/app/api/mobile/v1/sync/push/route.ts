import { NextResponse } from "next/server";
import { offlineSyncPayloadSchema } from "@/lib/validation/schemas";
import { SyncConflictResolver } from "@/lib/offline/sync-conflict-resolver";
import { EventBus } from "@/lib/observability/event-bus";
import { AnomalyDetector } from "@/lib/observability/anomaly-detector";
import zlib from "zlib";

const resolver = new SyncConflictResolver();
const anomalyDetector = new AnomalyDetector();

const MAX_COMPRESSED_SIZE = 1024 * 1024 * 2; // 2MB raw compressed upload limit
const MAX_DECOMPRESSED_SIZE = 1024 * 1024 * 5; // 5MB decompressed limit (zip bomb protection)

/**
 * Progressively decompresses a gzip buffer chunk-by-chunk and aborts early
 * if the decompressed size threshold (5MB) is exceeded.
 */
function decompressProgressively(buffer: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const gunzip = zlib.createGunzip();
    const chunks: Buffer[] = [];
    let decompressedBytes = 0;

    gunzip.on("data", (chunk) => {
      decompressedBytes += chunk.length;
      if (decompressedBytes > MAX_DECOMPRESSED_SIZE) {
        gunzip.destroy();
        reject(new Error("Decompressed size limit exceeded"));
      } else {
        chunks.push(chunk);
      }
    });

    gunzip.on("end", () => {
      resolve(Buffer.concat(chunks));
    });

    gunzip.on("error", (err) => {
      reject(err);
    });

    gunzip.write(buffer);
    gunzip.end();
  });
}

export async function POST(request: Request) {
  const contentEncoding = request.headers.get("content-encoding") || "";
  const isGzip = contentEncoding.includes("gzip");

  let rawBody: Buffer;
  try {
    const contentLength = parseInt(request.headers.get("content-length") || "0", 10);
    if (contentLength > MAX_COMPRESSED_SIZE) {
      return NextResponse.json({ error: "Payload too large (compressed limit exceeded)" }, { status: 413 });
    }

    if (typeof request.arrayBuffer === "function") {
      const arrayBuffer = await request.arrayBuffer();
      rawBody = Buffer.from(arrayBuffer);
    } else {
      // Fallback for mock environments (e.g. Jest / JSDOM) where arrayBuffer is not defined
      const text = await request.text();
      rawBody = Buffer.from(text, isGzip ? "binary" : "utf-8");
    }

    if (rawBody.length > MAX_COMPRESSED_SIZE) {
      return NextResponse.json({ error: "Payload too large (body limit exceeded)" }, { status: 413 });
    }
  } catch (err) {
    return NextResponse.json({ error: "Failed to read request body" }, { status: 400 });
  }

  let body: any = {};
  if (isGzip) {
    try {
      const decompressedBuffer = await decompressProgressively(rawBody);
      const jsonString = decompressedBuffer.toString("utf-8");
      body = JSON.parse(jsonString);
    } catch (err: any) {
      if (err.message === "Decompressed size limit exceeded") {
        return NextResponse.json({ error: "Payload too large (decompressed limit exceeded)" }, { status: 413 });
      }
      return NextResponse.json({ error: "Failed to decompress sync payload" }, { status: 400 });
    }
  } else {
    try {
      const jsonString = rawBody.toString("utf-8");
      if (jsonString) {
        body = JSON.parse(jsonString);
      }
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }
  }

  const parse = offlineSyncPayloadSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: "Validation failed", details: parse.error.format() }, { status: 400 });
  }

  const { deviceId, mutations } = parse.data;
  const results = [];

  for (const mutation of mutations) {
    const res = resolver.resolveMutation({
      id: mutation.id,
      mutationType: mutation.mutationType,
      entityType: mutation.entityType,
      payload: mutation.payload,
      clientTimestamp: mutation.clientTimestamp,
    });
    results.push(res);
  }

  // Telemetry and network diagnostics extraction
  if (body.diagnostics) {
    try {
      const diag = body.diagnostics;
      const compression = diag.compressionStats;
      const syncParams = diag.syncParams;

      const bus = EventBus.getInstance();
      const nodeId = deviceId || "unknown-mobile";

      // Always publish success outcome when the sync route succeeds
      bus.publishMetric({
        nodeId,
        metricName: "mobile_sync_outcome",
        metricValue: 1.0,
      });

      if (diag.bandwidthKbps !== undefined) {
        bus.publishMetric({
          nodeId,
          metricName: "mobile_sync_bandwidth_kbps",
          metricValue: Number(diag.bandwidthKbps),
        });
      }

      if (diag.latencyMs !== undefined) {
        bus.publishMetric({
          nodeId,
          metricName: "mobile_sync_latency_ms",
          metricValue: Number(diag.latencyMs),
        });
      }

      if (syncParams) {
        if (syncParams.maxBatchSize !== undefined) {
          bus.publishMetric({
            nodeId,
            metricName: "mobile_sync_batch_size",
            metricValue: Number(syncParams.maxBatchSize),
          });
        }
        if (syncParams.compressionLevel !== undefined) {
          bus.publishMetric({
            nodeId,
            metricName: "mobile_sync_compression_level",
            metricValue: Number(syncParams.compressionLevel),
          });
        }
      }

      if (compression) {
        const ratio = Number(compression.compressionRatio || 0);
        const rawBytes = Number(compression.rawBytes || 0);
        const compressedBytes = Number(compression.compressedBytes || 0);

        bus.publishMetric({
          nodeId,
          metricName: "mobile_sync_compression_ratio",
          metricValue: ratio,
        });

        bus.publishMetric({
          nodeId,
          metricName: "mobile_sync_raw_bytes",
          metricValue: rawBytes,
        });

        bus.publishMetric({
          nodeId,
          metricName: "mobile_sync_compressed_bytes",
          metricValue: compressedBytes,
        });

        // Record ratio in anomaly detector
        anomalyDetector.recordCompressionRatio(nodeId, ratio, Number(diag.bandwidthKbps || 0));
      }
    } catch (telemetryErr) {
      console.error("[Sync API Telemetry] Failed to parse/publish diagnostics:", telemetryErr);
    }
  }

  return NextResponse.json(
    {
      message: "Sync batch processed",
      deviceId,
      processedCount: results.length,
      results,
    },
    { status: 200 }
  );
}
