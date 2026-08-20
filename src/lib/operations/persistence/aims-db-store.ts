/**
 * Runtime Data Access Store for AIMS / AutoOps Entities
 */

export interface InMemoryAimsStore {
  agents: Map<string, any>;
  energyTelemetry: Map<string, any>;
  energyOptimizations: Map<string, any>;
  fleetVehicles: Map<string, any>;
  fleetDispatches: Map<string, any>;
  biometricLogs: Map<string, any>;
  cloudCosts: Map<string, any>;
  carbonMetrics: Map<string, any>;
  campusResources: Map<string, any>;
}

export class AimsDbStore {
  private static instance: AimsDbStore;
  private store: InMemoryAimsStore = {
    agents: new Map(),
    energyTelemetry: new Map(),
    energyOptimizations: new Map(),
    fleetVehicles: new Map(),
    fleetDispatches: new Map(),
    biometricLogs: new Map(),
    cloudCosts: new Map(),
    carbonMetrics: new Map(),
    campusResources: new Map(),
  };

  public static getInstance(): AimsDbStore {
    if (!AimsDbStore.instance) {
      AimsDbStore.instance = new AimsDbStore();
    }
    return AimsDbStore.instance;
  }

  // Agents
  public saveAgent(agent: { agentId: string; domain: string; policyState: any; institutionId?: string }): void {
    const id = `agent_${agent.agentId}`;
    this.store.agents.set(id, {
      ...agent,
      id,
      institutionId: agent.institutionId || 'global',
      updatedAt: new Date().toISOString(),
    });
  }

  public getAgent(agentId: string): any {
    return this.store.agents.get(`agent_${agentId}`);
  }

  // Energy Optimizations
  public saveEnergyOptimization(opt: any): void {
    this.store.energyOptimizations.set(opt.id, {
      ...opt,
      createdAt: new Date().toISOString(),
    });
  }

  public getEnergyOptimizations(campusId?: string): any[] {
    const list = Array.from(this.store.energyOptimizations.values());
    if (campusId) {
      return list.filter((o) => o.campusId === campusId);
    }
    return list;
  }

  // Fleet Vehicles & Dispatches
  public saveVehicle(veh: any): void {
    this.store.fleetVehicles.set(veh.vehicleId, {
      ...veh,
      updatedAt: new Date().toISOString(),
    });
  }

  public getVehicle(vehicleId: string): any {
    return this.store.fleetVehicles.get(vehicleId);
  }

  public saveDispatch(dispatch: any): void {
    this.store.fleetDispatches.set(dispatch.routeId, {
      ...dispatch,
      createdAt: new Date().toISOString(),
    });
  }

  public getDispatches(campusId?: string): any[] {
    const list = Array.from(this.store.fleetDispatches.values());
    if (campusId) {
      return list.filter((d) => d.campusId === campusId);
    }
    return list;
  }

  // Biometric Logs
  public saveBiometricLog(log: any): void {
    this.store.biometricLogs.set(log.id, {
      ...log,
      createdAt: new Date().toISOString(),
    });
  }

  public getBiometricLogs(userId?: string): any[] {
    const list = Array.from(this.store.biometricLogs.values());
    if (userId) {
      return list.filter((b) => b.userId === userId);
    }
    return list;
  }

  // Carbon Metrics
  public saveCarbonMetric(metric: any): void {
    this.store.carbonMetrics.set(metric.id, {
      ...metric,
      createdAt: new Date().toISOString(),
    });
  }

  public getCarbonMetrics(campusId?: string): any[] {
    const list = Array.from(this.store.carbonMetrics.values());
    if (campusId) {
      return list.filter((c) => c.campusId === campusId);
    }
    return list;
  }

  // Campus Resources
  public saveResource(res: any): void {
    this.store.campusResources.set(res.resourceId, {
      ...res,
      updatedAt: new Date().toISOString(),
    });
  }

  public getResource(resourceId: string): any {
    return this.store.campusResources.get(resourceId);
  }

  public getAllResources(): any[] {
    return Array.from(this.store.campusResources.values());
  }

  public clear(): void {
    for (const key of Object.keys(this.store) as (keyof InMemoryAimsStore)[]) {
      this.store[key].clear();
    }
  }
}
