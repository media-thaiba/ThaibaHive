/**
 * Preemptive Hardening Controller
 * Sprint-042 (ARES) — ARES-004
 */

import { randomUUID } from 'crypto';
import { PreemptiveHardeningAction, ThreatCategory } from './ares-types';

export class PreemptiveHardeningController {
  private static instance: PreemptiveHardeningController | null = null;
  private actions: Map<string, PreemptiveHardeningAction> = new Map();
  private autonomousModeEnabled = true;

  private constructor() {
    if (process.env.ARES_AUTONOMOUS_HARDENING_ENABLED === 'false') {
      this.autonomousModeEnabled = false;
    }
  }

  public static getInstance(): PreemptiveHardeningController {
    if (!PreemptiveHardeningController.instance) {
      PreemptiveHardeningController.instance = new PreemptiveHardeningController();
    }
    return PreemptiveHardeningController.instance;
  }

  public static resetInstance(): void {
    PreemptiveHardeningController.instance = null;
  }

  public setAutonomousMode(enabled: boolean): void {
    this.autonomousModeEnabled = enabled;
  }

  public isAutonomousMode(): boolean {
    return this.autonomousModeEnabled;
  }

  /**
   * Plans and optionally applies preemptive hardening rules
   */
  public planHardeningAction(
    threatCategory: ThreatCategory,
    targetAsset: string,
    actionType: PreemptiveHardeningAction['actionType'],
    justification: string,
    params: Record<string, unknown> = {}
  ): PreemptiveHardeningAction {
    const action: PreemptiveHardeningAction = {
      actionId: `hard-${randomUUID().slice(0, 8)}`,
      threatCategory,
      actionType,
      targetAssetOrSubnet: targetAsset,
      parameters: params,
      status: this.autonomousModeEnabled ? 'APPLIED' : 'PROPOSED',
      appliedAt: this.autonomousModeEnabled ? new Date().toISOString() : undefined,
      justification,
    };

    this.actions.set(action.actionId, action);
    return action;
  }

  /**
   * Executes a proposed hardening action
   */
  public applyHardeningAction(actionId: string): boolean {
    const action = this.actions.get(actionId);
    if (!action || action.status === 'APPLIED') return false;

    action.status = 'APPLIED';
    action.appliedAt = new Date().toISOString();
    return true;
  }

  /**
   * Reverts an applied hardening action
   */
  public revertHardeningAction(actionId: string): boolean {
    const action = this.actions.get(actionId);
    if (!action || action.status !== 'APPLIED') return false;

    action.status = 'REVERTED';
    action.revertedAt = new Date().toISOString();
    return true;
  }

  public getActions(): PreemptiveHardeningAction[] {
    return Array.from(this.actions.values());
  }
}
