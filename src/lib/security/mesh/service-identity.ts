/**
 * Service Identity Resolver for Continuous mTLS Mesh
 * Sprint-041 (ZASM)
 */

export interface ServiceIdentity {
  serviceName: string;
  domain: string;
  fingerprintSha256: string;
  serialNumber: string;
  sanList: string[];
  role?: string;
  authenticatedAt: string;
}

export class ServiceIdentityResolver {
  private static registeredServices: Map<string, { role: string; allowedPeers: string[] }> = new Map([
    ['auth-service', { role: 'IAM', allowedPeers: ['*'] }],
    ['academic-service', { role: 'Core', allowedPeers: ['auth-service', 'gateway', 'finance-service'] }],
    ['finance-service', { role: 'Financial', allowedPeers: ['auth-service', 'academic-service', 'gateway'] }],
    ['gateway', { role: 'Edge', allowedPeers: ['*'] }],
    ['soar-orchestrator', { role: 'Security', allowedPeers: ['*'] }],
  ]);

  /**
   * Registers a service definition with role and permitted peers
   */
  public static registerService(serviceName: string, role: string, allowedPeers: string[]): void {
    this.registeredServices.set(serviceName, { role, allowedPeers });
  }

  /**
   * Checks whether callerService is authorized to communicate with targetService
   */
  public static isPeerAuthorized(callerService: string, targetService: string): boolean {
    const targetConfig = this.registeredServices.get(targetService);
    if (!targetConfig) {
      // Default to permitting registered internal mesh services if no explicit restriction
      return true;
    }

    if (targetConfig.allowedPeers.includes('*') || targetConfig.allowedPeers.includes(callerService)) {
      return true;
    }

    return false;
  }

  /**
   * Parses common name or SAN to extract canonical service name
   */
  public static parseServiceName(commonName: string): string {
    // e.g. "finance-service.mesh.thaiba.internal" -> "finance-service"
    const match = commonName.match(/^([a-zA-Z0-9_-]+)\.mesh\.thaiba\.internal$/);
    if (match) {
      return match[1];
    }
    return commonName;
  }
}
