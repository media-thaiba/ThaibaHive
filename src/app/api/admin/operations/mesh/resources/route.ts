import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { withDPoP } from '@/lib/identity/dpop-middleware';
import { CampusResourceBroker } from '@/lib/operations/mesh/campus-resource-broker';
import { CapacityOptimizer } from '@/lib/operations/mesh/capacity-optimizer';
import { resourceBookingSchema } from '@/lib/validation/aims-schemas';

export const GET = withDPoP(
  requireAuth(async (req: Request) => {
    const { searchParams } = new URL(req.url);
    const campusId = searchParams.get('campusId') || 'campus_main';

    const broker = new CampusResourceBroker();
    const optimizer = new CapacityOptimizer();

    const mockResources = [
      {
        resourceId: 'res_vr_lab',
        campusId: 'campus_main',
        name: 'VR Surgical Simulation Center',
        category: 'SPECIALIZED_EQUIPMENT' as const,
        capacityUnits: 20,
        isShareableCrossCampus: true,
        hourlyCostRateDollars: 60,
        activeReservations: [],
        institutionId: 'inst_default',
      },
      {
        resourceId: 'res_hpc_cluster',
        campusId: 'campus_north',
        name: 'Distributed GPU Research Cluster',
        category: 'COMPUTE_CLUSTER' as const,
        capacityUnits: 128,
        isShareableCrossCampus: true,
        hourlyCostRateDollars: 45,
        activeReservations: [],
        institutionId: 'inst_default',
      },
    ];

    for (const r of mockResources) {
      broker.registerResource(r);
    }

    const shareable = broker.getShareableResources(campusId);
    const recommendations = optimizer.optimizeAllocations(mockResources, campusId);

    return NextResponse.json({
      resources: shareable,
      crossCampusRecommendations: recommendations,
    });
  }, 'system:operations:view'),
  { required: false }
);

export const POST = withDPoP(
  requireAuth(async (req: Request) => {
    const body = await req.json();
    const parsed = resourceBookingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const broker = new CampusResourceBroker();
    broker.registerResource({
      resourceId: parsed.data.resourceId,
      campusId: parsed.data.hostCampusId,
      name: 'Campus Shared Facility',
      category: 'LECTURE_HALL',
      capacityUnits: parsed.data.unitsReserved * 2,
      isShareableCrossCampus: true,
      hourlyCostRateDollars: 30,
      activeReservations: [],
      institutionId: 'inst_default',
    });

    const result = broker.bookResource({
      reservationId: `res_${Date.now()}`,
      resourceId: parsed.data.resourceId,
      requestingCampusId: parsed.data.requestingCampusId,
      hostCampusId: parsed.data.hostCampusId,
      reservedByUserId: 'admin_user',
      startTimeIso: parsed.data.startTimeIso,
      endTimeIso: parsed.data.endTimeIso,
      unitsReserved: parsed.data.unitsReserved,
      status: 'CONFIRMED',
      lamportTimestamp: 1,
    });

    return NextResponse.json({
      success: result.success,
      reservation: result.reservation,
    });
  }, 'system:operations:manage'),
  { required: false }
);
