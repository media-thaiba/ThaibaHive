import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { facilityStore } from '@/lib/db/facility-store';
import { spatialTechnicianRouter } from '@/lib/operations/facility/workorders/spatial-technician-router';
import { ContractorDispatcher } from '@/lib/operations/facility/workorders/contractor-dispatcher';

export const dynamic = 'force-dynamic';

export const POST = requireAuth(async (req: Request, user: any) => {
  try {
    const body = await req.json();
    const tenantId = body.institutionId || user?.institutionId || 'global';
    const { workOrderNumber, equipmentId, targetLocation, requiredSkill, candidates, dispatchExternalContractor } = body;

    // External contractor dispatch option
    if (dispatchExternalContractor) {
      const contractorRes = await ContractorDispatcher.dispatchSpecialist(
        requiredSkill || 'general',
        body.isEmergency ?? false,
        tenantId
      );
      return NextResponse.json({ contractorDispatch: contractorRes });
    }

    let targetLoc = targetLocation;
    let targetEquipId = equipmentId || 'target_equip';

    if (workOrderNumber) {
      const wo = await facilityStore.getWorkOrder(workOrderNumber, tenantId);
      if (wo) {
        targetEquipId = wo.equipmentId || targetEquipId;
        targetLoc = {
          buildingId: wo.buildingId,
          floorId: wo.floorId,
          roomId: wo.roomId || undefined,
          x: 40,
          y: 60,
          z: wo.floorId.includes('basement') ? -1 : parseInt(wo.floorId.replace(/\D/g, '') || '1', 10),
        };
      }
    }

    if (!targetLoc) {
      return NextResponse.json({ error: 'Target location or valid workOrderNumber required' }, { status: 400 });
    }

    // Default candidate pool if none provided in request
    const candidateList = candidates || [
      {
        technicianId: 'tech_01',
        name: 'David (HVAC / Electrical)',
        skills: ['hvac', 'electrical', 'general'],
        location: { buildingId: targetLoc.buildingId, floorId: targetLoc.floorId, x: targetLoc.x + 10, y: targetLoc.y + 10, z: targetLoc.z },
        activeCaseload: 1,
      },
      {
        technicianId: 'tech_02',
        name: 'Elena (Plumbing / Mechanical)',
        skills: ['plumbing', 'mechanical', 'general'],
        location: { buildingId: targetLoc.buildingId, floorId: 'floor_1', x: 20, y: 30, z: 1 },
        activeCaseload: 0,
      },
    ];

    const ranked = spatialTechnicianRouter.rankTechnicians(candidateList, targetLoc, requiredSkill || 'hvac');
    const topTech = ranked[0];

    // Compute route for top candidate
    const topCandidateStart = candidateList.find((c: any) => c.technicianId === topTech.technicianId)?.location || {
      buildingId: targetLoc.buildingId,
      floorId: targetLoc.floorId,
      x: 0,
      y: 0,
      z: targetLoc.z,
    };

    const routePlan = spatialTechnicianRouter.computeRoute(
      topTech.technicianId,
      topCandidateStart,
      targetEquipId,
      targetLoc
    );

    return NextResponse.json({
      rankedCandidates: ranked,
      recommendedTechnician: topTech,
      spatialRoutePlan: routePlan,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}, 'facility:workorders:assign');
