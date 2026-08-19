/**
 * Real-Time Policy Propagation Mesh
 * Sprint-041 (ZASM)
 */

import { EventEmitter } from 'events';
import { SegmentationPolicyRule } from './segmentation-types';
import { PolicyEngine } from './policy-engine';

export type PolicyMeshEventType = 'POLICY_ADDED' | 'POLICY_UPDATED' | 'POLICY_REMOVED' | 'FULL_SYNC';

export interface PolicyMeshEvent {
  type: PolicyMeshEventType;
  policy?: SegmentationPolicyRule;
  policyId?: string;
  policies?: SegmentationPolicyRule[];
  sourceNodeId: string;
  timestamp: string;
}

export class PolicyPropagationMesh {
  private static instance: PolicyPropagationMesh | null = null;
  private eventEmitter: EventEmitter = new EventEmitter();
  private nodeId: string;
  private policyEngine: PolicyEngine;

  private constructor(nodeId?: string, policyEngine?: PolicyEngine) {
    this.nodeId = nodeId || `node-${Math.random().toString(36).substring(2, 9)}`;
    this.policyEngine = policyEngine || PolicyEngine.getInstance();

    this.eventEmitter.on('policy_mesh_event', (event: PolicyMeshEvent) => {
      this.handleIncomingEvent(event);
    });
  }

  public static getInstance(nodeId?: string, policyEngine?: PolicyEngine): PolicyPropagationMesh {
    if (!PolicyPropagationMesh.instance) {
      PolicyPropagationMesh.instance = new PolicyPropagationMesh(nodeId, policyEngine);
    }
    return PolicyPropagationMesh.instance;
  }

  public static resetInstance(): void {
    PolicyPropagationMesh.instance = null;
  }

  public getNodeId(): string {
    return this.nodeId;
  }

  /**
   * Broadcasts a policy addition/update event to the mesh
   */
  public broadcastPolicyUpdate(policy: SegmentationPolicyRule): PolicyMeshEvent {
    this.policyEngine.addPolicy(policy);

    const event: PolicyMeshEvent = {
      type: 'POLICY_UPDATED',
      policy,
      sourceNodeId: this.nodeId,
      timestamp: new Date().toISOString(),
    };

    this.eventEmitter.emit('policy_mesh_event', event);
    return event;
  }

  /**
   * Broadcasts a policy removal event to the mesh
   */
  public broadcastPolicyRemoval(policyId: string): PolicyMeshEvent {
    this.policyEngine.removePolicy(policyId);

    const event: PolicyMeshEvent = {
      type: 'POLICY_REMOVED',
      policyId,
      sourceNodeId: this.nodeId,
      timestamp: new Date().toISOString(),
    };

    this.eventEmitter.emit('policy_mesh_event', event);
    return event;
  }

  /**
   * Handles incoming mesh events
   */
  public handleIncomingEvent(event: PolicyMeshEvent): void {
    if (event.type === 'POLICY_UPDATED' && event.policy) {
      this.policyEngine.addPolicy(event.policy);
    } else if (event.type === 'POLICY_REMOVED' && event.policyId) {
      this.policyEngine.removePolicy(event.policyId);
    } else if (event.type === 'FULL_SYNC' && event.policies) {
      for (const p of event.policies) {
        this.policyEngine.addPolicy(p);
      }
    }
  }

  /**
   * Subscribes a listener to policy mesh events
   */
  public onEvent(callback: (event: PolicyMeshEvent) => void): () => void {
    this.eventEmitter.on('policy_mesh_event', callback);
    return () => {
      this.eventEmitter.off('policy_mesh_event', callback);
    };
  }
}
