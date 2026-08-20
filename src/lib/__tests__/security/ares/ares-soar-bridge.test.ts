/**
 * Unit tests for AresSoarBridge (ARES-004)
 */

import { AresSoarBridge } from '@/lib/security/ares/ares-soar-bridge';
import { EarlyWarningAlert } from '@/lib/security/ares/ares-types';
import { SoarOrchestrator } from '@/lib/security/soar/orchestrator';

describe('ARES-004: AresSoarBridge', () => {
  beforeEach(() => {
    AresSoarBridge.resetInstance();
  });

  it('should ignore alerts with MONITOR or ELEVATED_RISK tier', async () => {
    const bridge = AresSoarBridge.getInstance();
    const alert: EarlyWarningAlert = {
      alertId: 'alt-low-1',
      forecastId: 'fc-1',
      threatCategory: 'CREDENTIAL_STUFFING',
      severityTier: 'MONITOR',
      probability: 0.2,
      confidenceScore: 30,
      title: 'Low risk forecast',
      summary: 'Monitoring',
      evidenceSignals: [],
      recommendedActions: [],
      emittedAt: new Date().toISOString(),
      acknowledged: false,
    };

    const res = await bridge.handleEarlyWarningAlert(alert);
    expect(res).toBeNull();
    expect(bridge.getDispatchHistory().length).toBe(0);
  });

  it('should dispatch SOAR containment playbook when alert reaches CRITICAL_FORECAST', async () => {
    const mockOrchestrator = {
      executePlaybook: jest.fn().mockResolvedValue({
        execution_id: 'exec-soar-123',
        status: 'COMPLETED',
      }),
    } as unknown as SoarOrchestrator;

    const bridge = AresSoarBridge.getInstance(mockOrchestrator);
    const alert: EarlyWarningAlert = {
      alertId: 'alt-crit-1',
      forecastId: 'fc-2',
      threatCategory: 'DISTRIBUTED_DENIAL_OF_SERVICE',
      severityTier: 'CRITICAL_FORECAST',
      probability: 0.92,
      confidenceScore: 95,
      title: 'Critical DDoS Anticipated',
      summary: 'DDoS wave predicted',
      evidenceSignals: [],
      recommendedActions: [
        {
          actionId: 'act-1',
          threatCategory: 'DISTRIBUTED_DENIAL_OF_SERVICE',
          actionType: 'TRIGGER_SOAR_LOCKDOWN',
          targetAssetOrSubnet: 'campus-edge-gw',
          parameters: {},
          status: 'PROPOSED',
          justification: 'Containment',
        },
      ],
      emittedAt: new Date().toISOString(),
      acknowledged: false,
    };

    const res = await bridge.handleEarlyWarningAlert(alert);
    expect(res).not.toBeNull();
    expect(res?.status).toBe('DISPATCHED');
    expect(res?.executionId).toBe('exec-soar-123');
    expect(mockOrchestrator.executePlaybook).toHaveBeenCalled();
  });
});
