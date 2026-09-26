import { NeuroGpuItem, NeuroJobItem, NeuroNodeItem } from '../neuro-types';
import { GpuPlacementDecision } from './scheduler-types';
import { TopologyPlacer } from './topology-placer';

export class GangScheduler {
  /**
   * Attempts to allocate all required GPUs atomically for a job (All-or-Nothing).
   * Supports preemption of lower priority jobs if high-priority job cannot be placed.
   */
  public static scheduleGang(
    job: NeuroJobItem,
    nodes: NeuroNodeItem[],
    gpus: NeuroGpuItem[],
    runningJobs: NeuroJobItem[] = []
  ): GpuPlacementDecision | null {
    // 1. Direct placement without preemption
    const directDecision = TopologyPlacer.placeJob(job, nodes, gpus);
    if (directDecision) {
      return directDecision;
    }

    // 2. Preemption evaluation: only 'high' or 'urgent' jobs can preempt 'low' or 'preemptible' jobs
    if (job.priority !== 'urgent' && job.priority !== 'high') {
      return null;
    }

    const preemptibleJobs = runningJobs
      .filter((rj) => rj.priority === 'preemptible' || rj.priority === 'low')
      .sort((a, _b) => (a.priority === 'preemptible' ? -1 : 1));

    if (preemptibleJobs.length === 0) {
      return null;
    }

    const simulatedGpus = gpus.map((g) => ({ ...g }));
    const preemptedJobIds: string[] = [];

    for (const rj of preemptibleJobs) {
      // Free GPUs assigned to rj in simulation
      for (const sg of simulatedGpus) {
        if (sg.currentJobId === rj.id || sg.currentJobId === rj.jobId) {
          sg.status = 'idle';
          sg.currentJobId = null;
          sg.vramAllocatedBytes = 0;
        }
      }
      preemptedJobIds.push(rj.id);

      const decisionAfterPreempt = TopologyPlacer.placeJob(job, nodes, simulatedGpus);
      if (decisionAfterPreempt) {
        decisionAfterPreempt.preemptedJobIds = preemptedJobIds;
        return decisionAfterPreempt;
      }
    }

    return null;
  }
}
