import { soarMeshSync, SoarMeshMessage } from '@/lib/security/soar/soar-mesh-sync';

describe('SoarMeshSync', () => {
  beforeEach(() => {
    soarMeshSync.removeAllListeners();
  });

  it('should publish and subscribe to mesh events', (done) => {
    const receivedMessages: SoarMeshMessage[] = [];

    soarMeshSync.subscribe('EXECUTION_STARTED', (msg) => {
      receivedMessages.push(msg);
      expect(msg.type).toBe('EXECUTION_STARTED');
      expect(msg.execution_id).toBe('exec-mesh-123');
      expect(msg.node_id).toBe(soarMeshSync.getNodeId());
      done();
    });

    soarMeshSync.publish('EXECUTION_STARTED', { reason: 'auto_trigger' }, {
      execution_id: 'exec-mesh-123',
      playbook_id: 'pb-mesh',
    });
  });

  it('should broadcast general messages to wild-card handler', (done) => {
    soarMeshSync.subscribe((msg) => {
      expect(msg.type).toBe('KILLSWITCH_ACTIVATED');
      expect(msg.data?.actor).toBe('super_admin');
      done();
    });

    soarMeshSync.publish('KILLSWITCH_ACTIVATED', { actor: 'super_admin' });
  });
});
