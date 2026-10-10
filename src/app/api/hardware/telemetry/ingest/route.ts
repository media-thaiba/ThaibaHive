import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { TelemetryIngestionWorker } from "@/lib/hardware/telemetry-ingestion";
import { hardwareTelemetryIngestSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

/**
 * POST /api/hardware/telemetry/ingest
 * Ingest high-frequency telemetry / beacon packets with in-memory buffering.
 */
export const POST = requireAuth(async (request: Request, session) => {
  const institutionId = await resolveRequestInstitution(session);

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = hardwareTelemetryIngestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 400 }
    );
  }

  try {
    const result = await TelemetryIngestionWorker.ingestTelemetry(
      institutionId,
      parsed.data
    );

    return NextResponse.json(result, { status: 202 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to ingest telemetry" },
      { status: 500 }
    );
  }
}, "hardware:telemetry:read");
