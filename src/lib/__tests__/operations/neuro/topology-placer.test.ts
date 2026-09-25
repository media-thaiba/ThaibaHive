import { TopologyPlacer } from '../../../operations/neuro/scheduler/topology-placer';
import { GangScheduler } from '../../../operations/neuro/scheduler/gang-scheduler';
import { NeuroGpuItem, NeuroJobItem, NeuroNodeItem } from '../../../operations/neuro/neuro-types';

describe('TopologyPlacer & GangScheduler (NEURO-004)', () => {
  const mockNode1: NeuroNodeItem = {
    id: 'node-01',
    nodeId: 'NODE-01',
    clusterId: 'cluster-01',
    hostname: 'node01.campus.edu',
    ipAddress: '10.0.0.1',
    nodeType: 'compute',
    cpuCores: 64,
    ramBytes: 549755813888,
    gpuCount: 4,
    gpuModel: 'NVIDIA-H100-SXM5-80GB',
    status: 'ready',
    isCloudBurst: false,
    cloudProvider: 'on_prem',
    currentPowerWatts: 400,
    temperatureCelsius: 38,
    institutionId: 'inst_01',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockNode2: NeuroNodeItem = {
    ...mockNode1,
    id: 'node-02',
    nodeId: 'NODE-02',
    hostname: 'node02.campus.edu',
    ipAddress: '10.0.0.2',
  };

  const mockGpus: NeuroGpuItem[] = [
    // 4 GPUs on Node 1 with NVLink
    {
      id: 'gpu-1-0',
      gpuId: 'GPU-1-0',
      nodeId: 'node-01',
      gpuIndex: 0,
      model: 'NVIDIA-H100-SXM5-80GB',
      vramTotalBytes: 85899345920,
      vramAllocatedBytes: 0,
      utilizationPercent: 0,
      temperatureCelsius: 35,
      powerDrawWatts: 120,
      smClockMhz: 1980,
      memoryClockMhz: 1593,
      pcieBandwidthGbps: 64,
      nvlinkActive: true,
      numaNode: 0,
      status: 'idle',
      institutionId: 'inst_01',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'gpu-1-1',
      gpuId: 'GPU-1-1',
      nodeId: 'node-01',
      gpuIndex: 1,
      model: 'NVIDIA-H100-SXM5-80GB',
      vramTotalBytes: 85899345920,
      vramAllocatedBytes: 0,
      utilizationPercent: 0,
      temperatureCelsius: 35,
      powerDrawWatts: 120,
      smClockMhz: 1980,
      memoryClockMhz: 1593,
      pcieBandwidthGbps: 64,
      nvlinkActive: true,
      numaNode: 0,
      status: 'idle',
      institutionId: 'inst_01',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    // 2 GPUs on Node 2
    {
      id: 'gpu-2-0',
      gpuId: 'GPU-2-0',
      nodeId: 'node-02',
      gpuIndex: 0,
      model: 'NVIDIA-H100-SXM5-80GB',
      vramTotalBytes: 85899345920,
      vramAllocatedBytes: 0,
      utilizationPercent: 0,
      temperatureCelsius: 35,
      powerDrawWatts: 120,
      smClockMhz: 1980,
      memoryClockMhz: 1593,
      pcieBandwidthGbps: 64,
      nvlinkActive: true,
      numaNode: 0,
      status: 'idle',
      institutionId: 'inst_01',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'gpu-2-1',
      gpuId: 'GPU-2-1',
      nodeId: 'node-02',
      gpuIndex: 1,
      model: 'NVIDIA-H100-SXM5-80GB',
      vramTotalBytes: 85899345920,
      vramAllocatedBytes: 0,
      utilizationPercent: 0,
      temperatureCelsius: 35,
      powerDrawWatts: 120,
      smClockMhz: 1980,
      memoryClockMhz: 1593,
      pcieBandwidthGbps: 64,
      nvlinkActive: true,
      numaNode: 0,
      status: 'idle',
      institutionId: 'inst_01',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  it('should place a single-node job with high NVLink affinity', () => {
    const job: NeuroJobItem = {
      id: 'job-1',
      jobId: 'JOB-1',
      jobName: 'VisionTransformer',
      userId: 'staff_1',
      departmentId: 'dept_cs',
      clusterId: 'cluster-01',
      jobType: 'batch_training',
      priority: 'normal',
      status: 'queued',
      requestedGpus: 2,
      gpuModelRequirement: 'NVIDIA-H100',
      minVramBytes: 40000000000,
      containerImage: 'pytorch/pytorch:2.4',
      entrypointCommand: 'python train.py',
      runtimeSeconds: 0,
      tokensCostTotal: 0,
      carbonSavedKg: 0,
      merkleProofHash: '',
      institutionId: 'inst_01',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const decision = TopologyPlacer.placeJob(job, [mockNode1, mockNode2], mockGpus);

    expect(decision).not.toBeNull();
    expect(decision?.allocatedNodes.length).toBe(1);
    expect(decision?.allocatedNodes[0].nodeId).toBe('node-01');
    expect(decision?.allAllocatedGpuIds.length).toBe(2);
    expect(decision?.interconnectType).toBe('nvlink');
    expect(decision?.topologyAffinityScore).toBe(1.0);
  });

  it('should place a multi-node distributed job using gang-scheduling across InfiniBand mesh', () => {
    const job: NeuroJobItem = {
      id: 'job-dist',
      jobId: 'JOB-DIST',
      jobName: 'DistributedLlama',
      userId: 'staff_1',
      departmentId: 'dept_cs',
      clusterId: 'cluster-01',
      jobType: 'distributed_training',
      priority: 'high',
      status: 'queued',
      requestedGpus: 4,
      gpuModelRequirement: 'ANY',
      minVramBytes: 40000000000,
      containerImage: 'pytorch/pytorch:2.4',
      entrypointCommand: 'torchrun --nproc_per_node=2 train.py',
      runtimeSeconds: 0,
      tokensCostTotal: 0,
      carbonSavedKg: 0,
      merkleProofHash: '',
      institutionId: 'inst_01',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const decision = GangScheduler.scheduleGang(job, [mockNode1, mockNode2], mockGpus);

    expect(decision).not.toBeNull();
    expect(decision?.allAllocatedGpuIds.length).toBe(4);
  });

  it('should preempt a low-priority job when high-priority job requires capacity', () => {
    const busyGpus = mockGpus.map((g) => ({
      ...g,
      status: 'allocated' as const,
      currentJobId: 'job-low-priority',
    }));

    const runningLowJob: NeuroJobItem = {
      id: 'job-low-priority',
      jobId: 'JOB-LOW',
      jobName: 'LowPriorityCrawler',
      userId: 'staff_2',
      departmentId: 'dept_cs',
      clusterId: 'cluster-01',
      jobType: 'batch_training',
      priority: 'preemptible',
      status: 'running',
      requestedGpus: 2,
      gpuModelRequirement: 'ANY',
      minVramBytes: 20000000000,
      containerImage: 'pytorch/pytorch:2.4',
      entrypointCommand: 'python crawl.py',
      runtimeSeconds: 300,
      tokensCostTotal: 5,
      carbonSavedKg: 0,
      merkleProofHash: '',
      institutionId: 'inst_01',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const urgentJob: NeuroJobItem = {
      id: 'job-urgent',
      jobId: 'JOB-URGENT',
      jobName: 'ICU-EmergencyModel',
      userId: 'staff_1',
      departmentId: 'dept_med',
      clusterId: 'cluster-01',
      jobType: 'inference_service',
      priority: 'urgent',
      status: 'queued',
      requestedGpus: 2,
      gpuModelRequirement: 'ANY',
      minVramBytes: 40000000000,
      containerImage: 'vllm/vllm-openai:latest',
      entrypointCommand: 'vllm serve',
      runtimeSeconds: 0,
      tokensCostTotal: 0,
      carbonSavedKg: 0,
      merkleProofHash: '',
      institutionId: 'inst_01',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const decision = GangScheduler.scheduleGang(urgentJob, [mockNode1], busyGpus, [runningLowJob]);

    expect(decision).not.toBeNull();
    expect(decision?.preemptedJobIds).toContain('job-low-priority');
    expect(decision?.allAllocatedGpuIds.length).toBe(2);
  });
});
