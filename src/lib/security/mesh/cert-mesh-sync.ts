/**
 * Redis PubSub Dynamic Certificate Revocation & Mesh Broadcast
 * Sprint-041 (ZASM)
 */

import { EventEmitter } from 'events';
import { CrlManager } from '../pki/crl-manager';
import { MtlsAuthenticator } from './mtls-authenticator';

export type MeshCertEventType = 'CERT_REVOKED' | 'CERT_ROTATED' | 'CRL_UPDATED';

export interface MeshCertEvent {
  type: MeshCertEventType;
  serialNumber?: string;
  serviceName?: string;
  reason?: string;
  timestamp: string;
  sourceNodeId: string;
}

export class CertMeshSync {
  private static instance: CertMeshSync | null = null;
  private eventEmitter: EventEmitter = new EventEmitter();
  private nodeId: string;
  private crlManager: CrlManager;
  private authenticator?: MtlsAuthenticator;

  private constructor(nodeId?: string, crlManager?: CrlManager, authenticator?: MtlsAuthenticator) {
    this.nodeId = nodeId || `node-${Math.random().toString(36).substring(2, 9)}`;
    this.crlManager = crlManager || CrlManager.getInstance();
    this.authenticator = authenticator;

    // Listen to local events
    this.eventEmitter.on('mesh_event', (event: MeshCertEvent) => {
      this.handleIncomingEvent(event);
    });
  }

  public static getInstance(nodeId?: string, crlManager?: CrlManager, authenticator?: MtlsAuthenticator): CertMeshSync {
    if (!CertMeshSync.instance) {
      CertMeshSync.instance = new CertMeshSync(nodeId, crlManager, authenticator);
    }
    return CertMeshSync.instance;
  }

  public static resetInstance(): void {
    CertMeshSync.instance = null;
  }

  public getNodeId(): string {
    return this.nodeId;
  }

  /**
   * Publishes a certificate revocation event to the mesh
   */
  public publishRevocation(serialNumber: string, reason?: string): MeshCertEvent {
    const event: MeshCertEvent = {
      type: 'CERT_REVOKED',
      serialNumber,
      reason: reason || 'KEY_COMPROMISE',
      timestamp: new Date().toISOString(),
      sourceNodeId: this.nodeId,
    };

    // Update local CRL
    this.crlManager.revokeCertificate({
      serialNumber,
      reason: event.reason as any,
      revokedBy: `node:${this.nodeId}`,
    });

    if (this.authenticator) {
      this.authenticator.addRevokedSerial(serialNumber);
    }

    // Broadcast
    this.eventEmitter.emit('mesh_event', event);
    return event;
  }

  /**
   * Publishes a certificate rotation event to the mesh
   */
  public publishRotation(serviceName: string, newSerial: string): MeshCertEvent {
    const event: MeshCertEvent = {
      type: 'CERT_ROTATED',
      serviceName,
      serialNumber: newSerial,
      timestamp: new Date().toISOString(),
      sourceNodeId: this.nodeId,
    };

    this.eventEmitter.emit('mesh_event', event);
    return event;
  }

  /**
   * Handles incoming mesh events from Redis PubSub or local bus
   */
  public handleIncomingEvent(event: MeshCertEvent): void {
    if (event.type === 'CERT_REVOKED' && event.serialNumber) {
      this.crlManager.revokeCertificate({
        serialNumber: event.serialNumber,
        reason: (event.reason as any) || 'UNSPECIFIED',
        revokedBy: `remote:${event.sourceNodeId}`,
      });

      if (this.authenticator) {
        this.authenticator.addRevokedSerial(event.serialNumber);
      }
    }
  }

  /**
   * Subscribes a listener callback to mesh certificate events
   */
  public onEvent(callback: (event: MeshCertEvent) => void): () => void {
    this.eventEmitter.on('mesh_event', callback);
    return () => {
      this.eventEmitter.off('mesh_event', callback);
    };
  }
}
