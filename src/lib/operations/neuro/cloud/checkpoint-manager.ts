import { NeuroDbStore, neuroStore } from '../../../db/neuro-store';
import { NeuroJobCheckpointItem } from '../neuro-types';
import { CheckpointSaveResult } from './cloud-types';

export class CheckpointManager {
  private store: NeuroDbStore;

  constructor(store: NeuroDbStore = neuroStore) {
    this.store = store;
  }

  /**
   * Saves or flushes an emergency checkpoint for a running job.
   */
  public async saveCheckpoint(
    jobId: string,
    stepNumber: number,
    epochNumber: number,
    lossValue: number | null = null,
    isEmergency: boolean = false,
    tenantId: string = 'global'
  ): Promise<CheckpointSaveResult> {
    const startTime = Date.now();
    const checkpointId = `CHK_${jobId}_STEP_${stepNumber}_${Date.now()}`;
    const storageUri = `s3://neuro-checkpoints/${tenantId}/${jobId}/step_${stepNumber}.pt`;
    const sha256Hash = `sha256_${Date.now().toString(16)}_${Math.random().toString(36).substring(2, 10)}`;
    const fileSizeBytes = 14 * 1024 * 1024 * 1024; // 14GB simulated model weights

    await this.store.createCheckpoint({
      checkpointId,
      jobId,
      stepNumber,
      epochNumber,
      lossValue,
      storageUri,
      fileSizeBytes,
      sha256Hash,
      isPreemptionEmergency: isEmergency,
      institutionId: tenantId,
    });

    const duration = Date.now() - startTime;

    return {
      checkpointId,
      jobId,
      stepNumber,
      epochNumber,
      storageUri,
      sha256Hash,
      fileSizeBytes,
      isEmergencyFlush: isEmergency,
      saveDurationMs: duration,
    };
  }

  /**
   * Retrieves the latest checkpoint for restoring a preempted or paused job.
   */
  public async getLatestCheckpoint(jobId: string, tenantId: string = 'global'): Promise<NeuroJobCheckpointItem | null> {
    const list = await this.store.listCheckpoints(jobId, tenantId);
    return list.length > 0 ? list[0] : null;
  }
}
