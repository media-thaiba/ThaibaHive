/**
 * Vector Clock Implementation for Distributed Multi-Region Systems
 * Part of Sprint-035: Global Multi-Tenant Cross-Region Disaster Recovery Drills & Automated Failover Verification
 */

import { TenantRegion } from "@/db";

export type ClockComparison = "EQUAL" | "GREATER" | "LESSER" | "CONCURRENT";

export class VectorClock {
  private clock: Map<TenantRegion, number> = new Map();
  private logicalTime: number = 0;

  constructor(initial: Record<string, number> = {}, logicalTime: number = Date.now()) {
    for (const [region, count] of Object.entries(initial)) {
      this.clock.set(region as TenantRegion, count);
    }
    this.logicalTime = logicalTime;
  }

  public get(region: TenantRegion): number {
    return this.clock.get(region) || 0;
  }

  public getLogicalTime(): number {
    return this.logicalTime;
  }

  public increment(region: TenantRegion): void {
    const current = this.get(region);
    this.clock.set(region, current + 1);
    this.logicalTime = Math.max(this.logicalTime + 1, Date.now());
  }

  public merge(other: VectorClock): void {
    for (const [region, count] of other.clock.entries()) {
      const current = this.get(region);
      this.clock.set(region, Math.max(current, count));
    }
    this.logicalTime = Math.max(this.logicalTime, other.logicalTime) + 1;
  }

  public compare(other: VectorClock): ClockComparison {
    let greater = false;
    let lesser = false;

    const allRegions = new Set<TenantRegion>([
      ...Array.from(this.clock.keys()),
      ...Array.from(other.clock.keys()),
    ]);

    for (const region of allRegions) {
      const v1 = this.get(region);
      const v2 = other.get(region);

      if (v1 > v2) greater = true;
      if (v1 < v2) lesser = true;
    }

    if (greater && !lesser) return "GREATER";
    if (lesser && !greater) return "LESSER";
    if (!greater && !lesser) return "EQUAL";
    return "CONCURRENT";
  }

  public toJSON(): { clock: Record<string, number>; logicalTime: number } {
    const clockObj: Record<string, number> = {};
    for (const [k, v] of this.clock.entries()) {
      clockObj[k] = v;
    }
    return {
      clock: clockObj,
      logicalTime: this.logicalTime,
    };
  }
}
