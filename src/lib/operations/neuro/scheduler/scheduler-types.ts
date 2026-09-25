import { JobPriority, JobStatus, NeuroGpuItem, NeuroJobItem, NeuroNodeItem } from '../neuro-types';

export interface FairShareWeightConfig {
  fairShareWeight: number; // e.g. 0.50
  jobPriorityWeight: number; // e.g. 0.30
  waitBoostWeight: number; // e.g. 0.20
  halfLifeDecayFactor: number; // e.g. 0.95
}

export interface SchedulingQueueItem {
  job: NeuroJobItem;
  compositePriorityScore: number;
  fairShareScore: number;
  waitDurationHours: number;
}

export interface GpuPlacementDecision {
  jobId: string;
  allocatedNodes: Array<{
    nodeId: string;
    hostname: string;
    gpuIds: string[];
    gpuIndices: number[];
  }>;
  allAllocatedGpuIds: string[];
  topologyAffinityScore: number; // 0.0 - 1.0
  interconnectType: 'nvlink' | 'infiniband' | 'pcie' | 'hybrid';
  preemptedJobIds: string[];
}

export interface TopologyPlacementCandidate {
  node: NeuroNodeItem;
  availableGpus: NeuroGpuItem[];
  intraNodeNvlinkCount: number;
  affinityScore: number;
}

export interface SchedulingCycleResult {
  scheduledCount: number;
  pendingCount: number;
  decisions: GpuPlacementDecision[];
  unplacedJobs: Array<{ jobId: string; reason: string }>;
  evaluationDurationMs: number;
}
