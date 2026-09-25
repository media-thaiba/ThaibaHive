import { EcoMeshSynchronizer } from '../../../operations/vision/emergency/eco-mesh-synchronizer';
import { BackupPowerPrioritizer } from '../../../operations/vision/emergency/backup-power-prioritizer';

describe('EcoMeshSynchronizer Emergency Microgrid & Backup Power Coordination', () => {
  it('should generate emergency dispatch command with 40% BESS SoC reserve floor', () => {
    const { command, loadSheddingPlan } = EcoMeshSynchronizer.buildEmergencyDispatchCommand('fac_main', true);

    expect(command.command).toBe('isolate_microgrid');
    expect(command.bessMinReserveSocPercent).toBe(40.0);
    expect(command.emergencyLightingOverride).toBe(true);

    expect(loadSheddingPlan.totalPowerShedKw).toBeGreaterThan(100);
    expect(loadSheddingPlan.guaranteedSecurityRuntimeHours).toBeGreaterThanOrEqual(8.0);
  });

  it('should calculate load shedding and security runtime hours accurately', () => {
    const plan = BackupPowerPrioritizer.generateLoadSheddingPlan('fac_dorm', 500, 25);
    expect(plan.guaranteedSecurityRuntimeHours).toBe(20.0);
    expect(plan.shedLoads.length).toBe(4);
  });
});
