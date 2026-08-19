import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { mobileSyncTelemetryBatchSchema } from "@/lib/validation/schemas";
import { MobileSyncTelemetryAggregator } from "@/lib/observability/mobile-sync-telemetry-aggregator";

export const POST = requireAuth(async (request: Request) => {
  if (process.env.MOBILE_TELEMETRY_ENABLED === "false") {
    return NextResponse.json({
      success: true,
      ingestedEvents: 0,
      message: "Mobile telemetry disabled",
      timestamp: new Date().toISOString(),
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request payload" },
      { status: 400 }
    );
  }

  const parsed = mobileSyncTelemetryBatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: parsed.error.format(),
      },
      { status: 400 }
    );
  }

  try {
    MobileSyncTelemetryAggregator.getInstance().recordBatch(parsed.data.events);

    return NextResponse.json({
      success: true,
      ingestedEvents: parsed.data.events.length,
      deviceId: parsed.data.deviceId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[MobileTelemetryAPI] Failed to ingest telemetry batch:", error);
    return NextResponse.json(
      { error: "Failed to record telemetry batch" },
      { status: 500 }
    );
  }
});
