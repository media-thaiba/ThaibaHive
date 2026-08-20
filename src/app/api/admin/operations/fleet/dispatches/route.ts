import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { withDPoP } from '@/lib/identity/dpop-middleware';
import { VehicleRoutingEngine } from '@/lib/operations/fleet/vehicle-routing-engine';
import { AimsDbStore } from '@/lib/operations/persistence/aims-db-store';
import { fleetDispatchSchema } from '@/lib/validation/aims-schemas';

export const GET = withDPoP(
  requireAuth(async (req: Request) => {
    const { searchParams } = new URL(req.url);
    const campusId = searchParams.get('campusId') || undefined;
    const store = AimsDbStore.getInstance();
    const dispatches = store.getDispatches(campusId);

    return NextResponse.json({
      dispatches,
      activeCount: dispatches.filter((d) => d.status === 'SCHEDULED' || d.status === 'ACTIVE').length,
    });
  }, 'system:fleet:manage'),
  { required: false }
);

export const POST = withDPoP(
  requireAuth(async (req: Request) => {
    const body = await req.json();
    const parsed = fleetDispatchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const router = new VehicleRoutingEngine();
    const vehicle = {
      vehicleId: parsed.data.vehicleId,
      campusId: parsed.data.campusId,
      vehicleType: 'SHUTTLE_BUS' as const,
      latitude: 12.971,
      longitude: 77.594,
      speedKmph: 0,
      odometerKm: 20000,
      batterySoCRatio: 0.85,
      engineTempCelsius: 85,
      brakePadWearPercent: 20,
      tirePressurePsi: 33,
      passengerCount: 0,
      maxCapacity: 25,
      status: 'IDLE' as const,
      timestamp: new Date().toISOString(),
      institutionId: 'inst_default',
    };

    const stops = parsed.data.stops.map((s) => ({
      stopId: s.stopId,
      name: s.name,
      latitude: s.latitude,
      longitude: s.longitude,
      estimatedArrivalIso: new Date().toISOString(),
      demandPickupCount: s.demandPickupCount,
      dropoffCount: 0,
    }));

    const dispatchPlan = router.optimizeRoute(vehicle, stops);
    AimsDbStore.getInstance().saveDispatch(dispatchPlan);

    return NextResponse.json({
      success: true,
      dispatch: dispatchPlan,
    });
  }, 'system:fleet:manage'),
  { required: false }
);
