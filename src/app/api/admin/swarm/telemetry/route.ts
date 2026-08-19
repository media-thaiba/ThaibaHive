import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { decompressPayload } from "@/lib/observability/compression";
import { EventBus } from "@/lib/observability/event-bus";
import { z } from "zod";

const telemetryBatchSchema = z.array(
  z.union([
    z.object({
      type: z.literal("event"),
      data: z.object({
        eventSource: z.string(),
        severity: z.enum(["info", "warning", "error", "critical"]),
        message: z.string(),
      }),
    }),
    z.object({
      type: z.literal("metric"),
      data: z.object({
        nodeId: z.string(),
        metricName: z.string(),
        metricValue: z.number(),
      }),
    }),
  ])
);

const MAX_COMPRESSED_SIZE = 1024 * 1024 * 2; // 2MB limit on compressed request body
const MAX_DECOMPRESSED_SIZE = 1024 * 1024 * 5; // 5MB limit on decompressed content (zip bomb protection)

async function handler(req: Request, session: any) {
  // Enforce tenant boundary check
  const institutionId = session.institutionId;
  if (!institutionId) {
    return NextResponse.json({ error: "Unauthorized tenant" }, { status: 403 });
  }

  try {
    const contentLength = parseInt(req.headers.get("content-length") || "0", 10);
    if (contentLength > MAX_COMPRESSED_SIZE) {
      return NextResponse.json({ error: "Payload too large (compressed limit exceeded)" }, { status: 413 });
    }

    const contentEncoding = req.headers.get("content-encoding") || "auto";
    const rawBodyBuffer = await req.arrayBuffer();
    const buffer = Buffer.from(rawBodyBuffer);

    // Decompress payload
    const method = contentEncoding.includes("gzip") ? "gzip" : contentEncoding.includes("br") ? "brotli" : "auto";
    
    // Safety check: before full JSON parse, check the byte size after decompression
    // For zip bomb mitigation, we decompress first, and check string size
    let decompressed: any;
    try {
      decompressed = await decompressPayload(buffer, method);
    } catch (decompError) {
      return NextResponse.json({ error: "Failed to decompress telemetry payload" }, { status: 400 });
    }

    if (!decompressed) {
      return NextResponse.json({ error: "Empty telemetry payload" }, { status: 400 });
    }

    // Check size of decompressed JSON string
    const decompressedStr = JSON.stringify(decompressed);
    if (decompressedStr.length > MAX_DECOMPRESSED_SIZE) {
      return NextResponse.json({ error: "Payload too large (decompressed limit exceeded)" }, { status: 413 });
    }

    // Validate schema
    const parsed = telemetryBatchSchema.safeParse(decompressed);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid telemetry batch structure", details: parsed.error.format() }, { status: 400 });
    }

    const batch = parsed.data;
    const bus = EventBus.getInstance();

    // Publish telemetry items to EventBus
    for (const item of batch) {
      if (item.type === "event") {
        bus.publishEvent(item.data);
      } else if (item.type === "metric") {
        bus.publishMetric(item.data);
      }
    }

    return NextResponse.json({ success: true, processedCount: batch.length });
  } catch (err) {
    console.error("[Telemetry Ingestion API] Process failure:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Gated behind the 'observability:write' permission
export const POST = requireAuth(handler, "observability:write");
