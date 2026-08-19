/**
 * Continuous mTLS Authentication & Handshake Middleware
 * Sprint-041 (ZASM)
 */

import { CaEngine } from '../pki/ca-engine';
import { ServiceIdentity, ServiceIdentityResolver } from './service-identity';

export interface MtlsAuthResult {
  authenticated: boolean;
  statusCode: number;
  reason?: string;
  identity?: ServiceIdentity;
}

export class MtlsAuthenticator {
  private caEngine: CaEngine;
  private revokedSerials: Set<string> = new Set();

  constructor(caEngine?: CaEngine) {
    this.caEngine = caEngine || CaEngine.getInstance();
  }

  /**
   * Registers a revoked serial number in the local authenticator
   */
  public addRevokedSerial(serialNumber: string): void {
    this.revokedSerials.add(serialNumber.toUpperCase());
  }

  /**
   * Clears or updates revoked serial numbers
   */
  public updateRevocations(serialNumbers: string[]): void {
    this.revokedSerials = new Set(serialNumbers.map((s) => s.toUpperCase()));
  }

  /**
   * Authenticates an inter-service request given its client certificate PEM
   */
  public authenticateRequest(options: {
    clientCertPem: string;
    targetService?: string;
  }): MtlsAuthResult {
    const { clientCertPem, targetService } = options;

    if (!clientCertPem || !clientCertPem.trim()) {
      return {
        authenticated: false,
        statusCode: 401,
        reason: 'Missing required mTLS client certificate',
      };
    }

    // Verify certificate against internal Root CA
    const verification = this.caEngine.verifyCertificate(clientCertPem);
    if (!verification.valid || !verification.cert) {
      return {
        authenticated: false,
        statusCode: 401,
        reason: verification.reason || 'Invalid or untrusted client certificate',
      };
    }

    const cert = verification.cert;

    // Check if certificate has been revoked
    if (this.revokedSerials.has(cert.serialNumber.toUpperCase())) {
      return {
        authenticated: false,
        statusCode: 403,
        reason: `Certificate serial ${cert.serialNumber} has been revoked`,
      };
    }

    const serviceName = ServiceIdentityResolver.parseServiceName(cert.subject.commonName);

    // Verify peer authorization if targetService specified
    if (targetService && !ServiceIdentityResolver.isPeerAuthorized(serviceName, targetService)) {
      return {
        authenticated: false,
        statusCode: 403,
        reason: `Service '${serviceName}' is not authorized to communicate with '${targetService}'`,
      };
    }

    const identity: ServiceIdentity = {
      serviceName,
      domain: cert.subject.commonName,
      fingerprintSha256: cert.fingerprintSha256,
      serialNumber: cert.serialNumber,
      sanList: cert.sanList,
      role: cert.subject.organizationalUnit,
      authenticatedAt: new Date().toISOString(),
    };

    return {
      authenticated: true,
      statusCode: 200,
      identity,
    };
  }
}
