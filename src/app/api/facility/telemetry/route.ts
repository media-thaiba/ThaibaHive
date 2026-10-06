import { resolveRequestInstitution } from "@/lib/api/auth-guard";
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { sensorIngestionGateway } from '@/lib/operations/facility/ingestion/sensor-ingestion-gateway';
import { anomalyDetector } from '@/lib/operations/facility/predictive/anomaly-detector';
import { anomalyAlertManager } from '@/lib/operations/facility/predictive/anomaly-alert-manager';
import { facilityStreamManager } from '@/lib/operations/facility/streaming/facility-stream-manager';
import { facilityMetricsExporter } from '@/lib/operations/facility/telemetry/facility-metrics';
import { telemetryBatchSchema, telemetryPacketSchema } from '@/lib/validation/facility-schemas';

export const dynamic = 'force-dynamic';

export const POST = requireAuth(async (req: Request, session: any) => {
  const startTime = Date.now();
  try {
    const body = await req.json();

    let packets: any[] = [];
    let institutionId: string | undefined;

    if (body.packets && Array.isArray(body.packets)) {
      const parsedBatch = telemetryBatchSchema.safeParse(body);
      if (!parsedBatch.success) {
        return NextResponse.json({ error: parsedBatch.error.issues[0]?.message || 'Invalid batch payload' }, { status: 400 });
      }
      packets = parsedBatch.data.packets;
      const rawInst = parsedBatch.data.institutionId || undefined;
      institutionId = await resolveRequestInstitution(session, rawInst);
    } else {
      const parsedSingle = telemetryPacketSchema.safeParse(body);
      if (!parsedSingle.success) {
        return NextResponse.json({ error: parsedSingle.error.issues[0]?.message || 'Invalid packet payload' }, { status: 400 });
      }
      packets = [parsedSingle.data];
      const rawInst = (parsedSingle.data as any).institutionId || undefined;
      institutionId = await resolveRequestInstitution(session, rawInst);
    }

    const results = [];
    for (const pkt of packets) {
      const ingestRes = await sensorIngestionGateway.ingestPacket(pkt, institutionId);
      if (ingestRes.success && ingestRes.normalized) {
        // Run anomaly evaluation
        const anomaly = await anomalyDetector.evaluateSensor(
          pkt.sensorId,
          ingestRes.normalized.value,
          institutionId
        );

        if (anomaly.isAnomaly) {
          facilityMetricsExporter.recordAnomalyDetected();
          const alert = await anomalyAlertManager.processAnomaly(anomaly, 5000, institutionId);
          if (alert) {
            facilityStreamManager.broadcast({
              eventType: 'anomaly_alert',
              timestamp: new Date().toISOString(),
              institutionId,
              data: alert,
            });
          }
        }

        // Broadcast telemetry reading
        facilityStreamManager.broadcast({
          eventType: 'telemetry_reading',
          timestamp: new Date().toISOString(),
          institutionId,
          data: ingestRes.normalized,
        });
      }
      results.push(ingestRes);
    }

    const duration = Date.now() - startTime;
    facilityMetricsExporter.recordIngestion(duration);

    return NextResponse.json({
      success: true,
      processed: results.length,
      durationMs: duration,
      results,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}, 'facility:telemetry:ingest');
