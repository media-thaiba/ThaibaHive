import { NeuroDbStore } from '../../../db/neuro-store';
import { CheckpointManager } from '../../../operations/neuro/cloud/checkpoint-manager';
import { PreemptionResilienceHandler } from '../../../operations/neuro/cloud/preemption-resilience-handler';

describe('CheckpointManager & PreemptionResilienceHandler (NEURO-006)', () => {
  let store: NeuroDbStore;
  let checkpointManager: CheckpointManager;
  let preemptionHandler: PreemptionResilienceHandler;

  beforeEach(async () => {
    store = NeuroDbStore.getInstance();
    store.clearMemoryStore();
    checkpointManager = new CheckpointManager(store);
    preemptionHandler = new PreemptionResilienceHandler(store);

    const cluster = await store.createCluster({
      clusterId: 'CLUSTER-SPOT-BURST',
      name: 'Cloud Burst Cluster',
      institutionId: 'inst_01',
    });

    const node = await store.createNode({
      nodeId: 'NODE-AWS-SPOT-01',
      clusterId: cluster.id,
      hostname: 'ec2-spot-p5.aws.internal',
      ipAddress: '172.31.14.22',
      isCloudBurst: true,
      cloudProvider: 'aws',
      spotInstanceId: 'i-0987f65e4d3c2b1a0',
      status: 'ready',
      institutionId: 'inst_01',
    });

    await store.createJob({
      jobId: 'JOB-TRAINING-SPOT',
      jobName: 'SpotTrainingJob',
      userId: 'staff_1',
      departmentId: 'dept_cs',
      clusterId: cluster.id,
      status: 'running',
      institutionId: 'inst_01',
    });
  });

  it('should save periodic checkpoint snapshots with cryptographic hashes', async () => {
    const job = (await store.listJobs(undefined, 'inst_01'))[0];

    const result = await checkpointManager.saveCheckpoint(job.id, 1000, 1, 1.45, false, 'inst_01');

    expect(result.stepNumber).toBe(1000);
    expect(result.sha256Hash).toBeDefined();
    expect(result.isEmergencyFlush).toBe(false);

    const latest = await checkpointManager.getLatestCheckpoint(job.id, 'inst_01');
    expect(latest?.stepNumber).toBe(1000);
  });

  it('should handle cloud 2-minute preemption signal, emergency flush weights, and mark node draining', async () => {
    const job = (await store.listJobs(undefined, 'inst_01'))[0];
    const node = (await store.listNodes(undefined, 'inst_01'))[0];

    const signal = {
      provider: 'aws' as const,
      instanceId: 'i-0987f65e4d3c2b1a0',
      nodeId: node.id,
      timeRemainingSeconds: 120,
      receivedAt: new Date().toISOString(),
    };

    const recovery = await preemptionHandler.handlePreemptionSignal(signal, job.id, 2450, 3, 'inst_01');

    expect(recovery.status).toBe('resumed');
    expect(recovery.resumedAtStep).toBe(2450);

    const updatedNode = await store.getNodeById(node.id, 'inst_01');
    expect(updatedNode?.status).toBe('draining');

    const updatedJob = await store.getJobById(job.id, 'inst_01');
    expect(updatedJob?.status).toBe('preempted');
    expect(updatedJob?.priority).toBe('high');
  });
});
