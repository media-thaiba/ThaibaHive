/**
 * SOAR Multi-Node Mesh Synchronization
 * Sprint-040 — Distributed Cluster Event Broadcasting
 */

import { SoarExecutionContext } from './soar-types';
import { EventEmitter } from 'events';

export type SoarMeshEventType =
  | 'EXECUTION_STARTED'
  | 'EXECUTION_COMPLETED'
  | 'EXECUTION_FAILED'
  | 'APPROVAL_REQUESTED'
  | 'APPROVAL_RESOLVED'
  | 'KILLSWITCH_ACTIVATED'
  | 'KILLSWITCH_DEACTIVATED';

export interface SoarMeshMessage {
  type: SoarMeshEventType;
  node_id: string;
  timestamp: string;
  execution_id?: string;
  playbook_id?: string;
  target_entity?: { type: string; value: string };
  state?: string;
  data?: Record<string, any>;
}

export class SoarMeshSync {
  private static instance: SoarMeshSync;
  private emitter = new EventEmitter();
  private nodeId = `node_${Math.random().toString(36).substring(2, 9)}`;
  private isConnected = true;

  private constructor() {
    this.emitter.setMaxListeners(50);
  }

  public static getInstance(): SoarMeshSync {
    if (!SoarMeshSync.instance) {
      SoarMeshSync.instance = new SoarMeshSync();
    }
    return SoarMeshSync.instance;
  }

  public getNodeId(): string {
    return this.nodeId;
  }

  public publish(type: SoarMeshEventType, data?: Record<string, any>, context?: Partial<SoarExecutionContext>): SoarMeshMessage {
    const message: SoarMeshMessage = {
      type,
      node_id: this.nodeId,
      timestamp: new Date().toISOString(),
      execution_id: context?.execution_id,
      playbook_id: context?.playbook_id,
      target_entity: context?.target_entity,
      state: context?.state,
      data,
    };

    // Emit locally
    this.emitter.emit('message', message);
    this.emitter.emit(type, message);

    return message;
  }

  public subscribe(typeOrHandler: SoarMeshEventType | ((msg: SoarMeshMessage) => void), handler?: (msg: SoarMeshMessage) => void): void {
    if (typeof typeOrHandler === 'string' && handler) {
      this.emitter.on(typeOrHandler, handler);
    } else if (typeof typeOrHandler === 'function') {
      this.emitter.on('message', typeOrHandler);
    }
  }

  public unsubscribe(typeOrHandler: SoarMeshEventType | ((msg: SoarMeshMessage) => void), handler?: (msg: SoarMeshMessage) => void): void {
    if (typeof typeOrHandler === 'string' && handler) {
      this.emitter.off(typeOrHandler, handler);
    } else if (typeof typeOrHandler === 'function') {
      this.emitter.off('message', typeOrHandler);
    }
  }

  public removeAllListeners(): void {
    this.emitter.removeAllListeners();
  }
}

export const soarMeshSync = SoarMeshSync.getInstance();
