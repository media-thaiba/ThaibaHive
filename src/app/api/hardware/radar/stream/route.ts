import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { GeofenceEngine } from "@/lib/hardware/geofence-engine";
import { HardwareDeviceEngine } from "@/lib/hardware/device-engine";

export const dynamic = "force-dynamic";

/**
 * GET /api/hardware/radar/stream
 * Server-Sent Events (SSE) stream broadcasting live radar spatial state and zone densities.
 */
export const GET = requireAuth(async (request: Request, session) => {
  const institutionId = await resolveRequestInstitution(session);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // 1. Initial snapshot of zones and devices
      try {
        const [zones, devices] = await Promise.all([
          GeofenceEngine.listZones(institutionId, { isActive: true }),
          HardwareDeviceEngine.listDevices(institutionId, { isActive: true }),
        ]);

        const initialPayload = JSON.stringify({
          type: "snapshot",
          timestamp: new Date().toISOString(),
          zones,
          devices,
        });

        controller.enqueue(encoder.encode(`event: snapshot\ndata: ${initialPayload}\n\n`));
      } catch (err: any) {
        controller.enqueue(
          encoder.encode(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`)
        );
      }

      // 2. Periodic keep-alive & radar tick
      const interval = setInterval(async () => {
        if (request.signal.aborted) {
          clearInterval(interval);
          return;
        }

        try {
          const anomalies = await HardwareDeviceEngine.detectAnomalies(institutionId);
          const tickPayload = JSON.stringify({
            type: "radar_tick",
            timestamp: new Date().toISOString(),
            anomaliesCount: anomalies.length,
          });

          controller.enqueue(encoder.encode(`event: radar_tick\ndata: ${tickPayload}\n\n`));
        } catch {
          clearInterval(interval);
        }
      }, 5000);

      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}, "hardware:radar:view");
