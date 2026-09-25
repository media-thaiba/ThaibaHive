import { GET as getInventory, POST as postInventory } from '../../../app/api/facility/inventory/route';
import { GET as getContractors, POST as postContractors } from '../../../app/api/facility/contractors/route';
import { GET as getStream } from '../../../app/api/facility/stream/route';
import { facilityStore } from '../../db/facility-store';

describe('Facility Inventory, Contractors & SSE Stream API Routes (Sprint-052 FACILITY-017)', () => {
  beforeEach(() => {
    facilityStore.clearMemoryStore();
  });

  const mockAdminUser = {
    staffId: 'admin_01',
    role: 'admin',
    institutionId: 'inst_alpha',
  };

  it('should manage parts inventory and query automated reorder requisitions via API', async () => {
    await facilityStore.createPart({
      partNumber: 'VALVE-ACT-01',
      name: 'Electronic Ball Valve Actuator 24V',
      category: 'valves',
      quantityOnHand: 2,
      quantityReserved: 0,
      reorderThreshold: 5,
      targetStockLevel: 10,
      unitCost: 85.0,
      institutionId: 'inst_alpha',
    });

    const getPartsReq = new Request('http://localhost:3000/api/facility/inventory?tenantId=inst_alpha');
    const getPartsRes = await getInventory(getPartsReq, { params: Promise.resolve({}) } as any);
    expect(getPartsRes.status).toBe(200);
    const partsJson = await getPartsRes.json();
    expect(partsJson.parts.length).toBe(1);

    const checkReorderReq = new Request('http://localhost:3000/api/facility/inventory?tenantId=inst_alpha&checkReorder=true');
    const checkReorderRes = await getInventory(checkReorderReq, { params: Promise.resolve({}) } as any);
    expect(checkReorderRes.status).toBe(200);
    const reorderJson = await checkReorderRes.json();
    expect(reorderJson.requisitions.length).toBe(1);
    expect(reorderJson.requisitions[0].suggestedReorderQuantity).toBe(10);
  });

  it('should register contractor and verify SSE stream endpoint creation', async () => {
    const contReq = new Request('http://localhost:3000/api/facility/contractors', {
      method: 'POST',
      body: JSON.stringify({
        contractorId: 'CONT_SCHINDLER_01',
        companyName: 'Schindler Elevators & Escalators',
        contactName: 'Service Desk',
        email: 'help@schindler.com',
        phone: '+1-800-SCHINDLER',
        specializations: ['elevator', 'mechanical'],
        ratePerHour: 110.0,
        institutionId: 'inst_alpha',
      }),
    });

    const contRes = await postContractors(contReq, { params: Promise.resolve({}) } as any);
    expect(contRes.status).toBe(201);

    const streamReq = new Request('http://localhost:3000/api/facility/stream?tenantId=inst_alpha');
    const streamRes = await getStream(streamReq, { params: Promise.resolve({}) } as any);
    expect(streamRes.status).toBe(200);
    expect(streamRes.headers.get('Content-Type')).toBe('text/event-stream');
  });
});
