import { NeuroDbStore, neuroStore } from '../../../db/neuro-store';
import { CheckpointManager } from './checkpoint-manager';
import { PreemptionRecoveryResult, PreemptionSignal } from './cloud-types';

export class PreemptionResilienceHandler {
  private store: NeuroDbStore;
  private checkpointManager: CheckpointManager;

  constructor(store: NeuroDbStore = neuroStore) {
    this.store = store;
    this.checkpointManager = new CheckpointManager(store);
  }

  /**
   * Handles incoming 2-minute preemption notice from cloud provider.
   */
  public async handlePreemptionSignal(
    signal: PreemptionSignal,
    currentJobId: string,
    currentStep: number,
    currentEpoch: number,
    tenantId: string = 'global'
  ): Promise<PreemptionRecoveryResult> {
    const startTime = Date.now();

    // 1. Flush Emergency Checkpoint (< 90 seconds simulated)
    const checkpointResult = await this.checkpointManager.saveCheckpoint(
      currentJobId,
      currentStep,
      currentEpoch,
      0.95,
      true, // emergency
      tenantId
    );

    // 2. Mark preempted node as draining
    await this.store.updateNode(signal.nodeId, { status: 'draining' }, tenantId);

    // 3. Mark job as preempted and boost priority to 'high' for immediate re-scheduling
    await this.store.updateJob(currentJobId, {
      status: 'preempted',
      priority: 'high',
    }, tenantId);

    const duration = Date.now() - startTime;

    return {
      jobId: currentJobId,
      preemptedNodeId: signal.nodeId,
      targetNodeId: 'AUTO_RESCHEDULED',
      restoredFromCheckpointId: checkpointResult.checkpointId,
      resumedAtStep: currentStep,
      recoveryDurationMs: duration,
      status: 'resumed',
    };
  }
}
