/**
 * Certificate Revocation List (CRL) Manager
 * Sprint-041 (ZASM)
 */

import { RevocationRecord } from './pki-types';

export class CrlManager {
  private static instance: CrlManager | null = null;
  private revocations: Map<string, RevocationRecord> = new Map();

  private constructor() {}

  public static getInstance(): CrlManager {
    if (!CrlManager.instance) {
      CrlManager.instance = new CrlManager();
    }
    return CrlManager.instance;
  }

  public static resetInstance(): void {
    CrlManager.instance = null;
  }

  /**
   * Revokes a certificate by serial number
   */
  public revokeCertificate(options: {
    serialNumber: string;
    reason?: RevocationRecord['reason'];
    revokedBy?: string;
  }): RevocationRecord {
    const serial = options.serialNumber.toUpperCase();
    const record: RevocationRecord = {
      serialNumber: serial,
      revokedAt: new Date().toISOString(),
      reason: options.reason || 'UNSPECIFIED',
      revokedBy: options.revokedBy || 'system-admin',
    };

    this.revocations.set(serial, record);
    return record;
  }

  /**
   * Checks if a certificate serial number is revoked
   */
  public isRevoked(serialNumber: string): boolean {
    return this.revocations.has(serialNumber.toUpperCase());
  }

  /**
   * Retrieves revocation details for a serial number
   */
  public getRevocation(serialNumber: string): RevocationRecord | undefined {
    return this.revocations.get(serialNumber.toUpperCase());
  }

  /**
   * Lists all revoked serial numbers and records
   */
  public listRevocations(): RevocationRecord[] {
    return Array.from(this.revocations.values());
  }

  /**
   * Bulk loads revocation records (e.g. from DB or Redis sync)
   */
  public loadRevocations(records: RevocationRecord[]): void {
    for (const r of records) {
      this.revocations.set(r.serialNumber.toUpperCase(), r);
    }
  }
}
