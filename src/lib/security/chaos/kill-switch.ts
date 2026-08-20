/**
 * Global Chaos Circuit Breaker & Instant Kill-Switch
 * Sprint-042 (ARES) — ARES-008
 */

export interface KillSwitchTriggerEvent {
  triggeredAt: string;
  triggeredBy: string;
  reason: string;
  revertedInjectorsCount: number;
  durationMs: number;
}

export class ChaosKillSwitch {
  private static instance: ChaosKillSwitch | null = null;
  private isTripped = false;
  private tripHistory: KillSwitchTriggerEvent[] = [];
  private revertCallbacks: (() => Promise<void>)[] = [];

  private constructor() {}

  public static getInstance(): ChaosKillSwitch {
    if (!ChaosKillSwitch.instance) {
      ChaosKillSwitch.instance = new ChaosKillSwitch();
    }
    return ChaosKillSwitch.instance;
  }

  public static resetInstance(): void {
    ChaosKillSwitch.instance = null;
  }

  public registerRevertCallback(callback: () => Promise<void>): void {
    this.revertCallbacks.push(callback);
  }

  /**
   * Immediately aborts all active chaos experiments and reverts all fault injectors
   * Target latency: < 100 milliseconds
   */
  public async trip(reason: string, triggeredBy: string = 'AUTOMATED_GUARDRAILS'): Promise<KillSwitchTriggerEvent> {
    const start = Date.now();
    this.isTripped = true;

    let count = 0;
    for (const cb of this.revertCallbacks) {
      try {
        await cb();
        count++;
      } catch (err) {
        console.error('Error during chaos kill-switch revert:', err);
      }
    }

    const durationMs = Date.now() - start;
    const event: KillSwitchTriggerEvent = {
      triggeredAt: new Date().toISOString(),
      triggeredBy,
      reason,
      revertedInjectorsCount: count,
      durationMs,
    };

    this.tripHistory.push(event);
    return event;
  }

  public isEmergencyTripped(): boolean {
    return this.isTripped;
  }

  public resetKillSwitch(): void {
    this.isTripped = false;
  }

  public getHistory(): KillSwitchTriggerEvent[] {
    return [...this.tripHistory];
  }
}
