/**
 * Device Trust Manual Override Manager
 * Sprint-041 (ZASM)
 */

import { TrustOverride } from './trust-types';
import { classifyTrustTier } from './trust-weights';

export class TrustOverrideManager {
  private static instance: TrustOverrideManager | null = null;
  private overrides: Map<string, TrustOverride> = new Map(); // deviceId -> TrustOverride

  private constructor() {}

  public static getInstance(): TrustOverrideManager {
    if (!TrustOverrideManager.instance) {
      TrustOverrideManager.instance = new TrustOverrideManager();
    }
    return TrustOverrideManager.instance;
  }

  public static resetInstance(): void {
    TrustOverrideManager.instance = null;
  }

  /**
   * Applies a manual trust override for a device
   */
  public applyOverride(options: {
    deviceId: string;
    tenantId?: string;
    forcedScore: number;
    reason: string;
    appliedBy: string;
    ttlHours?: number;
  }): TrustOverride {
    if (!options.reason || !options.reason.trim()) {
      throw new Error('Justification reason is required for manual trust override');
    }

    const ttlHours = options.ttlHours || 24;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000).toISOString();
    const forcedTier = classifyTrustTier(options.forcedScore);

    const override: TrustOverride = {
      deviceId: options.deviceId,
      tenantId: options.tenantId || 'global',
      forcedScore: options.forcedScore,
      forcedTier,
      reason: options.reason,
      appliedBy: options.appliedBy,
      expiresAt,
      createdAt: now.toISOString(),
    };

    this.overrides.set(options.deviceId, override);
    return override;
  }

  /**
   * Checks if an active (non-expired) override exists for a device
   */
  public getActiveOverride(deviceId: string): TrustOverride | undefined {
    const override = this.overrides.get(deviceId);
    if (!override) return undefined;

    const now = new Date();
    if (now > new Date(override.expiresAt)) {
      this.overrides.delete(deviceId);
      return undefined;
    }

    return override;
  }

  /**
   * Clears a manual override
   */
  public removeOverride(deviceId: string): boolean {
    return this.overrides.delete(deviceId);
  }

  /**
   * Lists all active overrides
   */
  public listActiveOverrides(): TrustOverride[] {
    const active: TrustOverride[] = [];
    const now = new Date();

    for (const [id, override] of this.overrides.entries()) {
      if (now <= new Date(override.expiresAt)) {
        active.push(override);
      } else {
        this.overrides.delete(id);
      }
    }

    return active;
  }
}
