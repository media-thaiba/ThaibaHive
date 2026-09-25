import { NeuroGpuItem, NeuroJobItem, NeuroNodeItem } from '../neuro-types';
import { GpuPlacementDecision, TopologyPlacementCandidate } from './scheduler-types';

export class TopologyPlacer {
  /**
   * Evaluates available nodes and GPUs to find the optimal topology placement.
   */
  public static placeJob(
    job: NeuroJobItem,
    nodes: NeuroNodeItem[],
    gpus: NeuroGpuItem[]
  ): GpuPlacementDecision | null {
    const requested = job.requestedGpus;
    const minVram = job.minVramBytes;
    const modelReq = job.gpuModelRequirement;

    // Filter candidate GPUs: idle, sufficient VRAM, matching model (if specified)
    const availableGpusByNode = new Map<string, NeuroGpuItem[]>();
    for (const gpu of gpus) {
      if (gpu.status !== 'idle' || gpu.currentJobId) continue;
      if (gpu.vramTotalBytes - gpu.vramAllocatedBytes < minVram) continue;
      if (modelReq !== 'ANY' && !gpu.model.toLowerCase().includes(modelReq.toLowerCase())) continue;

      const list = availableGpusByNode.get(gpu.nodeId) || [];
      list.push(gpu);
      availableGpusByNode.set(gpu.nodeId, list);
    }

    // Filter nodes that are 'ready'
    const readyNodes = nodes.filter((n) => n.status === 'ready');
    const candidates: TopologyPlacementCandidate[] = [];

    for (const node of readyNodes) {
      const nodeGpus = availableGpusByNode.get(node.id) || [];
      if (nodeGpus.length === 0) continue;

      // Sort GPUs by index for contiguous placement
      nodeGpus.sort((a, b) => a.gpuIndex - b.gpuIndex);
      const nvlinkCount = nodeGpus.filter((g) => g.nvlinkActive).length;

      // Compute single-node affinity score
      let score = 0.8;
      if (nodeGpus.length >= requested) {
        // Can satisfy within single node
        score = nvlinkCount >= requested ? 1.0 : 0.9;
      }

      candidates.push({
        node,
        availableGpus: nodeGpus,
        intraNodeNvlinkCount: nvlinkCount,
        affinityScore: score,
      });
    }

    // Case A: Single node placement (highest preference)
    const singleNodeCandidate = candidates
      .filter((c) => c.availableGpus.length >= requested)
      .sort((a, b) => b.affinityScore - a.affinityScore)[0];

    if (singleNodeCandidate) {
      const allocatedGpus = singleNodeCandidate.availableGpus.slice(0, requested);
      return {
        jobId: job.id,
        allocatedNodes: [
          {
            nodeId: singleNodeCandidate.node.id,
            hostname: singleNodeCandidate.node.hostname,
            gpuIds: allocatedGpus.map((g) => g.id),
            gpuIndices: allocatedGpus.map((g) => g.gpuIndex),
          },
        ],
        allAllocatedGpuIds: allocatedGpus.map((g) => g.id),
        topologyAffinityScore: singleNodeCandidate.affinityScore,
        interconnectType: singleNodeCandidate.intraNodeNvlinkCount >= requested ? 'nvlink' : 'pcie',
        preemptedJobIds: [],
      };
    }

    // Case B: Multi-node gang-placement
    // Sort nodes by available GPUs descending
    candidates.sort((a, b) => b.availableGpus.length - a.availableGpus.length);
    let totalAvailable = 0;
    for (const c of candidates) totalAvailable += c.availableGpus.length;
    if (totalAvailable < requested) return null; // Cannot satisfy

    let remainingToAllocate = requested;
    const allocatedNodes: GpuPlacementDecision['allocatedNodes'] = [];
    const allAllocatedGpuIds: string[] = [];

    for (const cand of candidates) {
      if (remainingToAllocate <= 0) break;
      const count = Math.min(remainingToAllocate, cand.availableGpus.length);
      const gpusToTake = cand.availableGpus.slice(0, count);

      allocatedNodes.push({
        nodeId: cand.node.id,
        hostname: cand.node.hostname,
        gpuIds: gpusToTake.map((g) => g.id),
        gpuIndices: gpusToTake.map((g) => g.gpuIndex),
      });

      for (const g of gpusToTake) {
        allAllocatedGpuIds.push(g.id);
      }
      remainingToAllocate -= count;
    }

    if (remainingToAllocate > 0) return null; // Incomplete gang

    return {
      jobId: job.id,
      allocatedNodes,
      allAllocatedGpuIds,
      topologyAffinityScore: 0.85, // Multi-node InfiniBand mesh
      interconnectType: 'infiniband',
      preemptedJobIds: [],
    };
  }
}
