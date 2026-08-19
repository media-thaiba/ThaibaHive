/**
 * Automated Certificate Rotation & Expiration Lifecycle Manager
 * Sprint-041 (ZASM)
 */

import { CaEngine } from './ca-engine';
import { CrlManager } from './crl-manager';
import { IssuedCertificate } from './pki-types';

export interface RotationConfig {
  renewalThresholdPercentage: number; // e.g. 30 = renew when <= 30% validity remains
  graceOverlapMinutes: number;         // overlap window for dual-cert validity
  defaultValidityDays: number;
}

export interface RotationStatus {
  serviceName: string;
  currentSerial: string;
  expiresAt: string;
  percentageRemaining: number;
  needsRotation: boolean;
  isRevoked: boolean;
}

export class CertRotationManager {
  private caEngine: CaEngine;
  private crlManager: CrlManager;
  private activeServiceCerts: Map<string, IssuedCertificate> = new Map(); // serviceName -> cert
  private previousCerts: Map<string, IssuedCertificate> = new Map();     // serviceName -> previous cert during grace window

  private config: RotationConfig = {
    renewalThresholdPercentage: 30,
    graceOverlapMinutes: 1440, // 24 hours overlap
    defaultValidityDays: 90,
  };

  constructor(caEngine?: CaEngine, crlManager?: CrlManager, config?: Partial<RotationConfig>) {
    this.caEngine = caEngine || CaEngine.getInstance();
    this.crlManager = crlManager || CrlManager.getInstance();
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Registers or initializes a certificate for a service
   */
  public registerServiceCertificate(serviceName: string, cert?: IssuedCertificate): IssuedCertificate {
    const activeCert =
      cert ||
      this.caEngine.issueServiceCertificate({
        serviceName,
        validityDays: this.config.defaultValidityDays,
      });

    this.activeServiceCerts.set(serviceName, activeCert);
    return activeCert;
  }

  /**
   * Retrieves the active certificate for a service
   */
  public getActiveCertificate(serviceName: string): IssuedCertificate | undefined {
    return this.activeServiceCerts.get(serviceName);
  }

  /**
   * Evaluates the expiration and rotation status for a service certificate
   */
  public evaluateStatus(serviceName: string): RotationStatus {
    const cert = this.activeServiceCerts.get(serviceName);
    if (!cert) {
      throw new Error(`No active certificate registered for service '${serviceName}'`);
    }

    const now = Date.now();
    const validFrom = new Date(cert.validFrom).getTime();
    const validTo = new Date(cert.validTo).getTime();
    const totalLifetime = Math.max(1, validTo - validFrom);
    const timeRemaining = Math.max(0, validTo - now);
    const percentageRemaining = Math.round((timeRemaining / totalLifetime) * 100);

    const isRevoked = this.crlManager.isRevoked(cert.serialNumber);
    const needsRotation = isRevoked || percentageRemaining <= this.config.renewalThresholdPercentage;

    return {
      serviceName,
      currentSerial: cert.serialNumber,
      expiresAt: cert.validTo,
      percentageRemaining,
      needsRotation,
      isRevoked,
    };
  }

  /**
   * Executes certificate rotation for a service
   */
  public rotateCertificate(serviceName: string): {
    oldCert: IssuedCertificate;
    newCert: IssuedCertificate;
    rotatedAt: string;
  } {
    const currentCert = this.activeServiceCerts.get(serviceName);
    if (!currentCert) {
      throw new Error(`Cannot rotate certificate: Service '${serviceName}' is not registered`);
    }

    // Keep the old certificate in grace overlap cache
    this.previousCerts.set(serviceName, currentCert);

    // Issue replacement certificate
    const newCert = this.caEngine.issueServiceCertificate({
      serviceName,
      validityDays: this.config.defaultValidityDays,
      sanList: currentCert.sanList,
    });

    this.activeServiceCerts.set(serviceName, newCert);

    return {
      oldCert: currentCert,
      newCert,
      rotatedAt: new Date().toISOString(),
    };
  }

  /**
   * Checks whether a certificate is valid for a service (current active or in grace overlap)
   */
  public isCertificateAccepted(serviceName: string, serialNumber: string): boolean {
    if (this.crlManager.isRevoked(serialNumber)) {
      return false;
    }

    const active = this.activeServiceCerts.get(serviceName);
    if (active && active.serialNumber === serialNumber) {
      return true;
    }

    const previous = this.previousCerts.get(serviceName);
    if (previous && previous.serialNumber === serialNumber) {
      // Check if within validity
      const now = new Date();
      return now <= new Date(previous.validTo);
    }

    return false;
  }

  /**
   * Scans all registered services and rotates certificates needing renewal
   */
  public checkAndRotateAll(): { rotatedServices: string[]; totalEvaluated: number } {
    const rotatedServices: string[] = [];
    const services = Array.from(this.activeServiceCerts.keys());

    for (const s of services) {
      const status = this.evaluateStatus(s);
      if (status.needsRotation) {
        this.rotateCertificate(s);
        rotatedServices.push(s);
      }
    }

    return {
      rotatedServices,
      totalEvaluated: services.length,
    };
  }
}
