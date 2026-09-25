import { BackupPowerPrioritizer, LoadSheddingPlan } from './backup-power-prioritizer';

export interface EcoMeshEmergencyDispatchPayload {
  facilityId: string;
  command: 'lock_emergency_reserve' | 'isolate_microgrid' | 'shed_non_critical_loads';
  bessMinReserveSocPercent: number;
  evseLoadShedKw: number;
  emergencyLightingOverride: boolean;
  timestamp: string;
}

export class EcoMeshSynchronizer {
  public static buildEmergencyDispatchCommand(
    facilityId: string,
    triggerIslanding: boolean = false
  ): {
    command: EcoMeshEmergencyDispatchPayload;
    loadSheddingPlan: LoadSheddingPlan;
  } {
    const loadSheddingPlan = BackupPowerPrioritizer.generateLoadSheddingPlan(facilityId);

    const command: EcoMeshEmergencyDispatchPayload = {
      facilityId,
      command: triggerIslanding ? 'isolate_microgrid' : 'lock_emergency_reserve',
      bessMinReserveSocPercent: 40.0, // Lock 40% BESS SoC for life-safety critical power
      evseLoadShedKw: 50.0,
      emergencyLightingOverride: true,
      timestamp: new Date().toISOString(),
    };

    return { command, loadSheddingPlan };
  }
}
