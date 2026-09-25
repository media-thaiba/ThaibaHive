/**
 * EV Charging Orchestrator
 * Dynamic load balancing, priority charging queue, and station state management
 */

import { EvChargingSessionState } from '../eco-types';
import { EcoDbStore } from '../../../db/eco-store';

export interface ChargerLoadAllocation {
  stationId: string;
  allocatedPowerKw: number;
  vehicleType: string;
  isThrottled: boolean;
}

export class EvChargingOrchestrator {
  private static instance: EvChargingOrchestrator;
  private store: EcoDbStore;
  private activeSessions: Map<string, EvChargingSessionState> = new Map();

  constructor(store?: EcoDbStore) {
    this.store = store || EcoDbStore.getInstance();
  }

  public static getInstance(): EvChargingOrchestrator {
    if (!EvChargingOrchestrator.instance) {
      EvChargingOrchestrator.instance = new EvChargingOrchestrator();
    }
    return EvChargingOrchestrator.instance;
  }

  public clearSessions(): void {
    this.activeSessions.clear();
  }

  /**
   * Start a new smart EV charging session
   */
  public async startSession(session: EvChargingSessionState, institutionId: string = 'global'): Promise<EvChargingSessionState> {
    this.activeSessions.set(session.sessionId, session);
    await this.store.createEvFleetSession({
      sessionId: session.sessionId,
      stationId: session.stationId,
      vehicleId: session.vehicleId,
      vehicleType: session.vehicleType,
      driverId: session.driverId,
      sessionType: session.isV2GActive ? 'v2g_discharge' : 'smart_charge',
      startSoCPercent: session.currentSoC,
      currentSoCPercent: session.currentSoC,
      targetSoCPercent: session.targetSoC,
      energyDeliveredKwh: session.energyDeliveredKwh,
      energyDischargedKwh: session.energyDischargedKwh,
      status: 'active',
      institutionId,
    });
    return session;
  }

  /**
   * Update active session metrics
   */
  public updateSession(sessionId: string, updates: Partial<EvChargingSessionState>): EvChargingSessionState | null {
    const existing = this.activeSessions.get(sessionId);
    if (!existing) return null;
    const updated = { ...existing, ...updates };
    this.activeSessions.set(sessionId, updated);
    return updated;
  }

  /**
   * Complete an active charging session
   */
  public async stopSession(sessionId: string, institutionId: string = 'global'): Promise<EvChargingSessionState | null> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return null;

    this.activeSessions.delete(sessionId);
    await this.store.updateEvFleetSession(
      sessionId,
      {
        status: 'completed',
        currentSoCPercent: session.currentSoC,
        energyDeliveredKwh: session.energyDeliveredKwh,
        energyDischargedKwh: session.energyDischargedKwh,
      },
      institutionId
    );

    return session;
  }

  /**
   * Dynamically allocate available EV capacity across active sessions (Load Shedding & Priority Scheduling)
   */
  public computeLoadAllocations(
    maxAvailableTotalKw: number,
    stationMaxLimits: Record<string, number> = {}
  ): ChargerLoadAllocation[] {
    const sessions = Array.from(this.activeSessions.values());
    if (sessions.length === 0) return [];

    // Sort by priority:
    // 1. Bus (highest priority - scheduled transit)
    // 2. Maintenance van
    // 3. Shuttle
    // 4. Staff commuter (lowest priority, can be throttled during peak hours)
    const priorityWeight: Record<string, number> = {
      bus: 4,
      maintenance_van: 3,
      shuttle: 2,
      staff_commuter: 1,
    };

    const sorted = [...sessions].sort(
      (a, b) => (priorityWeight[b.vehicleType] || 1) - (priorityWeight[a.vehicleType] || 1)
    );

    let remainingBudgetKw = Math.max(0, maxAvailableTotalKw);
    const allocations: ChargerLoadAllocation[] = [];

    for (const s of sorted) {
      const maxStationKw = stationMaxLimits[s.stationId] || 50.0;
      const requestedKw = Math.min(maxStationKw, s.allocatedPowerKw || maxStationKw);

      let allocatedKw = 0;
      let isThrottled = false;

      if (remainingBudgetKw >= requestedKw) {
        allocatedKw = requestedKw;
        remainingBudgetKw -= requestedKw;
      } else if (remainingBudgetKw > 6.0) {
        // Minimum EV charging is 6A (~1.4 kW on 1-phase or 4.1 kW on 3-phase)
        allocatedKw = Number(remainingBudgetKw.toFixed(1));
        remainingBudgetKw = 0;
        isThrottled = true;
      } else {
        allocatedKw = 0;
        isThrottled = true;
      }

      s.allocatedPowerKw = allocatedKw;
      allocations.push({
        stationId: s.stationId,
        allocatedPowerKw: allocatedKw,
        vehicleType: s.vehicleType,
        isThrottled,
      });
    }

    return allocations;
  }
}
