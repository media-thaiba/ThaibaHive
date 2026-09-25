import { NeuroDbStore } from '../../../db/neuro-store';
import { GpuSchedulerEngine } from '../../../operations/neuro/scheduler/gpu-scheduler-engine';

describe('GpuSchedulerEngine — Multi-Tenant Fair-Share & Priority Queue (NEURO-003)', () => {
  let store: NeuroDbStore;
  let engine: GpuSchedulerEngine;

  beforeEach(async () => {
    store = NeuroDbStore.getInstance();
    store.clearMemoryStore();
    engine = new GpuSchedulerEngine(store);

    // Setup cluster and node
    const cluster = await store.createCluster({
      clusterId: 'CLUSTER-MAIN',
      name: 'Main AI Cluster',
      institutionId: 'inst_01',
    });

    const node = await store.createNode({
      nodeId: 'NODE-01',
      clusterId: cluster.id,
      hostname: 'h100-node1.campus.edu',
      ipAddress: '10.0.0.1',
      gpuCount: 8,
      status: 'ready',
      institutionId: 'inst_01',
    });

    for (let i = 0; i < 8; i++) {
      await store.createGpu({
        gpuId: `GPU-NODE1-${i}`,
        nodeId: node.id,
        gpuIndex: i,
        model: 'NVIDIA-H100-SXM5-80GB',
        vramTotalBytes: 85899345920,
        status: 'idle',
        institutionId: 'inst_01',
      });
    }

    // Setup departmental quotas
    await store.setFairShareQuota({
      departmentId: 'dept_cs',
      departmentName: 'Computer Science',
      allocatedShareWeight: 2.0,
      maxConcurrentGpus: 8,
      historicalUsageDecayed: 10.0,
      institutionId: 'inst_01',
    });

    await store.setFairShareQuota({
      departmentId: 'dept_biomed',
      departmentName: 'Biomedical Engineering',
      allocatedShareWeight: 2.0,
      maxConcurrentGpus: 8,
      historicalUsageDecayed: 0.0, // Underutilized, should get priority boost
      institutionId: 'inst_01',
    });
  });

  it('should evaluate queue and schedule jobs prioritizing underutilized departments', async () => {
    const cluster = (await store.listClusters('inst_01'))[0];

    // Submit job from CS (higher past usage)
    await store.createJob({
      jobId: 'JOB-CS-1',
      jobName: 'NLP-Model',
      userId: 'staff_cs',
      departmentId: 'dept_cs',
      clusterId: cluster.id,
      requestedGpus: 4,
      priority: 'normal',
      status: 'queued',
      institutionId: 'inst_01',
    });

    // Submit job from Biomed (zero past usage -> higher fair-share score)
    await store.createJob({
      jobId: 'JOB-BIOMED-1',
      jobName: 'GenomicsTransformer',
      userId: 'staff_biomed',
      departmentId: 'dept_biomed',
      clusterId: cluster.id,
      requestedGpus: 4,
      priority: 'normal',
      status: 'queued',
      institutionId: 'inst_01',
    });

    const result = await engine.evaluateQueue('inst_01');

    const biomedJob = await store.getJobById('JOB-BIOMED-1', 'inst_01');
    expect(result.scheduledCount).toBe(2); // 4 + 4 = 8 GPUs fully allocated
    expect(result.decisions.length).toBe(2);
    // Biomed job should be evaluated and scheduled first due to fair share priority
    expect(result.decisions[0].jobId).toBe(biomedJob?.id);

    const updatedBiomedJob = await store.getJobById('JOB-BIOMED-1', 'inst_01');
    expect(updatedBiomedJob?.status).toBe('running');
    expect(updatedBiomedJob?.allocatedGpuIdsJson).toBeDefined();
  });

  it('should reject jobs exceeding department max concurrent GPU limit', async () => {
    const cluster = (await store.listClusters('inst_01'))[0];

    // Set quota max limit to 2 GPUs
    await store.setFairShareQuota({
      departmentId: 'dept_small',
      departmentName: 'Small Lab',
      allocatedShareWeight: 0.5,
      maxConcurrentGpus: 2,
      activeAllocatedGpus: 2,
      institutionId: 'inst_01',
    });

    await store.createJob({
      jobId: 'JOB-OVER-LIMIT',
      jobName: 'OverLimitJob',
      userId: 'staff_small',
      departmentId: 'dept_small',
      clusterId: cluster.id,
      requestedGpus: 2,
      status: 'queued',
      institutionId: 'inst_01',
    });

    const result = await engine.evaluateQueue('inst_01');

    expect(result.scheduledCount).toBe(0);
    expect(result.unplacedJobs.length).toBe(1);
    expect(result.unplacedJobs[0].reason).toContain('Department concurrent GPU limit reached');
  });
});
