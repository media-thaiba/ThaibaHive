import { AgentCommunicationMesh, AgentMessage } from '@/lib/operations/marl/agent-communication-mesh';

describe('AIMS-002 — AgentCommunicationMesh', () => {
  it('should route messages to subscribed domain and campus listeners', async () => {
    const mesh = new AgentCommunicationMesh();
    const received: AgentMessage[] = [];

    const unsubscribe = mesh.subscribe('hvac_energy', (msg) => {
      received.push(msg);
    });

    const msg: AgentMessage = {
      id: 'msg_001',
      senderAgentId: 'hvac_master',
      domain: 'hvac_energy',
      messageType: 'ENERGY_CURTAIL_REQUEST',
      payload: { curtailmentKw: 25 },
      timestamp: new Date().toISOString(),
      institutionId: 'inst_001',
      campusId: 'campus_north',
    };

    await mesh.publish(msg);
    expect(received.length).toBe(1);
    expect(received[0].id).toBe('msg_001');

    // Duplicate publish should be ignored by dedup cache
    await mesh.publish(msg);
    expect(received.length).toBe(1);

    unsubscribe();
    expect(mesh.getSubscriberCount('hvac_energy')).toBe(0);
  });
});
