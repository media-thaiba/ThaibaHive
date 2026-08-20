import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { telemetryIngestSchema, telemetryBatchIngestSchema } from '@/lib/validation/twin-schemas';
import { TelemetryIngester } from '@/lib/operations/twin/iot/telemetry-ingester';
import { SpatialStreamManager } from '@/lib/operations/twin/streaming/spatial-stream-manager';
import { TwinMetrics } from '@/lib/operations/twin/telemetry/twin-metrics';

const ingester = TelemetryIngester.getInstance();
const streamManager = SpatialStreamManager.getInstance();
const metrics = TwinMetrics.getInstance();

export const POST = requireAuth(async (request: Request, user: any) => {
  try {
    const body = await request.json();

    if (Array.isArray(body?.frames)) {
      const parse = telemetryBatchIngestSchema.safeParse(body);
      if (!parse.success) {
        return NextResponse.json({ error: 'Validation failed', details: parse.error.format() }, { status: 400 });
      }
      const tenantId = parse.data.institutionId || user?.institutionId || 'global';
      const results = await ingester.ingestBatch(parse.data.frames, { tenantId });
      metrics.incrementIotIngestion(tenantId, results.length);

      for (const res of results) {
        streamManager.broadcastTelemetry(res, tenantId);
        if (res.isAnomaly) {
          metrics.incrementSensorAnomaly(tenantId, res.metricType);
        }
      }

      return NextResponse.json({ success: true, count: results.length, frames: results }, { status: 200 });
    } else {
      const parse = telemetryIngestSchema.safeParse(body);
      if (!parse.success) {
        return NextResponse.json({ error: 'Validation failed', details: parse.error.format() }, { status: 400 });
      }
      const tenantId = parse.data.institutionId || user?.institutionId || 'global';
      const result = await ingester.ingestFrame(parse.data, { tenantId });
      metrics.incrementIotIngestion(tenantId, 1);
      streamManager.broadcastTelemetry(result, tenantId);

      if (result.isAnomaly) {
        metrics.incrementSensorAnomaly(tenantId, result.metricType);
      }

      return NextResponse.json({ success: true, frame: result }, { status: 200 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Telemetry ingestion failed' }, { status: 500 });
  }
}, 'twin:iot:ingest');
