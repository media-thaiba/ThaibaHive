import { NeuroDbStore, neuroStore } from '../../../db/neuro-store';
import { NeuroFairShareQuotaItem, NeuroGpuItem, NeuroJobItem, NeuroNodeItem } from '../neuro-types';
import { FairShareCalculator } from './fair-share-calculator';
import { GangScheduler } from './gang-scheduler';
import { GpuPlacementDecision, SchedulingCycleResult } from './scheduler-types';

export class GpuSchedulerEngine {
  private store: NeuroDbStore;

  constructor(store: NeuroDbStore = neuroStore) {
    this.store = store;
  }

  /**
   * Executes a full scheduler evaluation cycle for a tenant.
   */
  public async evaluateQueue(tenantId: string = 'global'): Promise<SchedulingCycleResult> {
    const startTime = Date.now();

    // 1. Fetch pending & queued jobs, active nodes, all GPUs, and quotas
    const allJobs = await this.store.listJobs(undefined, tenantId);
    const queuedJobs = allJobs.filter((j) => j.status === 'pending' || j.status === 'queued');
    const runningJobs = allJobs.filter((j) => j.status === 'running');
    const nodes = await this.store.listNodes(undefined, tenantId);
    const gpus = await this.store.listGpus(undefined, tenantId);
    const quotasList = await this.store.listFairShareQuotas(tenantId);

    const quotasMap = new Map<string, NeuroFairShareQuotaItem>();
    for (const q of quotasList) {
      quotasMap.set(q.departmentId, q);
    }

    // 2. Rank queue with FairShare & Priority calculation
    const rankedQueue = FairShareCalculator.rankQueue(queuedJobs, quotasMap);

    const decisions: GpuPlacementDecision[] = [];
    const unplacedJobs: Array<{ jobId: string; reason: string }> = [];

    // Working copies of GPUs and running jobs during the cycle
    const currentGpus = gpus.map((g) => ({ ...g }));
    let currentRunningJobs = [...runningJobs];

    for (const queueItem of rankedQueue) {
      const job = queueItem.job;
      const deptQuota = quotasMap.get(job.departmentId);

      // Check max concurrent GPUs per department limit
      if (deptQuota && deptQuota.activeAllocatedGpus + job.requestedGpus > deptQuota.maxConcurrentGpus) {
        unplacedJobs.push({
          jobId: job.id,
          reason: `Department concurrent GPU limit reached (${deptQuota.activeAllocatedGpus}/${deptQuota.maxConcurrentGpus})`,
        });
        continue;
      }

      // Try gang-scheduling
      const decision = GangScheduler.scheduleGang(job, nodes, currentGpus, currentRunningJobs);

      if (decision) {
        // Handle preempted jobs
        for (const pJobId of decision.preemptedJobIds) {
          await this.store.updateJob(pJobId, { status: 'preempted' }, tenantId);
          currentRunningJobs = currentRunningJobs.filter((rj) => rj.id !== pJobId);
        }

        // Apply allocations to currentGpus
        for (const gpuId of decision.allAllocatedGpuIds) {
          const g = currentGpus.find((item) => item.id === gpuId);
          if (g) {
            g.status = 'allocated';
            g.currentJobId = job.id;
            g.vramAllocatedBytes = job.minVramBytes;
            await this.store.updateGpu(g.id, {
              status: 'allocated',
              currentJobId: job.id,
              vramAllocatedBytes: job.minVramBytes,
            }, tenantId);
          }
        }

        // Update Job state to 'running'
        const allocatedNodeIds = decision.allocatedNodes.map((n) => n.nodeId);
        await this.store.updateJob(job.id, {
          status: 'running',
          startedAt: new Date().toISOString(),
          allocatedNodesJson: JSON.stringify(allocatedNodeIds),
          allocatedGpuIdsJson: JSON.stringify(decision.allAllocatedGpuIds),
        }, tenantId);

        // Update department quota
        if (deptQuota) {
          const newAllocated = deptQuota.activeAllocatedGpus + job.requestedGpus;
          const updatedUsage = FairShareCalculator.calculateDecayedUsage(
            deptQuota.historicalUsageDecayed,
            job.requestedGpus * 0.1,
            deptQuota.halfLifeDecayFactor
          );
          const newScore = FairShareCalculator.calculateFairShareScore(
            deptQuota.allocatedShareWeight,
            updatedUsage
          );

          await this.store.setFairShareQuota({
            departmentId: deptQuota.departmentId,
            departmentName: deptQuota.departmentName,
            activeAllocatedGpus: newAllocated,
            historicalUsageDecayed: updatedUsage,
            fairShareScore: newScore,
            institutionId: tenantId,
          });
        }

        decisions.push(decision);
      } else {
        unplacedJobs.push({
          jobId: job.id,
          reason: 'Insufficient matching GPUs or VRAM capacity in cluster',
        });
      }
    }

    const duration = Date.now() - startTime;

    return {
      scheduledCount: decisions.length,
      pendingCount: unplacedJobs.length,
      decisions,
      unplacedJobs,
      evaluationDurationMs: duration,
    };
  }
}
