import { PolicyEngine } from '@/lib/security/segmentation/policy-engine';
import { PolicyPropagationMesh, PolicyMeshEvent } from '@/lib/security/segmentation/policy-propagation-mesh';
import { SegmentationPolicyRule } from '@/lib/security/segmentation/segmentation-types';

describe('PolicyPropagationMesh', () => {
  let engine: PolicyEngine;

  beforeEach(() => {
    PolicyEngine.resetInstance();
    PolicyPropagationMesh.resetInstance();
    engine = PolicyEngine.getInstance();
  });

  it('broadcasts policy update and syncs policy engine', () => {
    const mesh = PolicyPropagationMesh.getInstance('node-1', engine);
    const events: PolicyMeshEvent[] = [];
    mesh.onEvent((e) => events.push(e));

    const newPolicy: SegmentationPolicyRule = {
      id: 'custom-isolation-policy',
      name: 'Custom Isolation',
      priority: 5,
      action: 'QUARANTINE',
      targetTrustTiers: ['UNTRUSTED'],
      enabled: true,
    };

    mesh.broadcastPolicyUpdate(newPolicy);

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('POLICY_UPDATED');
    expect(engine.getPolicy('custom-isolation-policy')).toBeDefined();
  });

  it('broadcasts policy removal and removes from policy engine', () => {
    const mesh = PolicyPropagationMesh.getInstance('node-1', engine);
    mesh.broadcastPolicyRemoval('default-high-trust-allow');

    expect(engine.getPolicy('default-high-trust-allow')).toBeUndefined();
  });
});
