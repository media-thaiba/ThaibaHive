import { NeuroDbStore } from '../../db/neuro-store';

describe('NeuroDbStore — High-Performance Research Compute Store & Tenant Isolation (NEURO-002)', () => {
  let store: NeuroDbStore;

  beforeEach(() => {
    store = NeuroDbStore.getInstance();
    store.clearMemoryStore();
  });

  it('should create and retrieve clusters with tenant boundary enforcement', async () => {
    const cluster = await store.createCluster({
      clusterId: 'CLUSTER-TITAN-01',
      name: 'Titan Deep Learning Cluster',
      clusterType: 'hybrid',
      schedulerType: 'slurm',
      region: 'us-east-dc1',
      totalNodes: 32,
      totalGpus: 256,
      institutionId: 'tenant_alpha',
    });

    expect(cluster.id).toBeDefined();
    expect(cluster.clusterId).toBe('CLUSTER-TITAN-01');

    const found = await store.getClusterById('CLUSTER-TITAN-01', 'tenant_alpha');
    expect(found).not.toBeNull();
    expect(found?.name).toBe('Titan Deep Learning Cluster');

    const crossTenant = await store.getClusterById('CLUSTER-TITAN-01', 'tenant_beta');
    expect(crossTenant).toBeNull();
  });

  it('should create nodes and GPUs and support filtered queries', async () => {
    const cluster = await store.createCluster({
      clusterId: 'CLUSTER-H100-01',
      name: 'H100 Cluster',
      institutionId: 'inst_01',
    });

    const node = await store.createNode({
      nodeId: 'NODE-DGX-01',
      clusterId: cluster.id,
      hostname: 'dgx-h100-node01.campus.edu',
      ipAddress: '10.240.0.11',
      gpuCount: 8,
      gpuModel: 'NVIDIA-H100-SXM5-80GB',
      institutionId: 'inst_01',
    });

    const gpu = await store.createGpu({
      gpuId: 'GPU-DGX01-0',
      nodeId: node.id,
      gpuIndex: 0,
      model: 'NVIDIA-H100-SXM5-80GB',
      vramTotalBytes: 85899345920,
      institutionId: 'inst_01',
    });

    const nodes = await store.listNodes(cluster.id, 'inst_01');
    expect(nodes.length).toBe(1);
    expect(nodes[0].hostname).toBe('dgx-h100-node01.campus.edu');

    const gpus = await store.listGpus(node.id, 'inst_01');
    expect(gpus.length).toBe(1);
    expect(gpus[0].gpuId).toBe('GPU-DGX01-0');
  });

  it('should manage job lifecycle and checkpoint creation', async () => {
    const cluster = await store.createCluster({
      clusterId: 'CLUSTER-01',
      name: 'Main Cluster',
      institutionId: 'inst_01',
    });

    const job = await store.createJob({
      jobId: 'JOB-LLM-70B',
      jobName: 'Llama-3.1-70B-FineTune',
      userId: 'staff_prof_chen',
      departmentId: 'dept_cs',
      clusterId: cluster.id,
      requestedGpus: 8,
      status: 'running',
      institutionId: 'inst_01',
    });

    expect(job.status).toBe('running');

    const checkpoint = await store.createCheckpoint({
      checkpointId: 'CHK-STEP-5000',
      jobId: job.id,
      stepNumber: 5000,
      epochNumber: 2,
      lossValue: 1.243,
      storageUri: 's3://research-checkpoints/job-llm-70b/step-5000.pt',
      sha256Hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      institutionId: 'inst_01',
    });

    const checkpoints = await store.listCheckpoints(job.id, 'inst_01');
    expect(checkpoints.length).toBe(1);
    expect(checkpoints[0].stepNumber).toBe(5000);
  });

  it('should handle fair-share quotas and billing accounts with double-entry ledger transactions', async () => {
    await store.setFairShareQuota({
      departmentId: 'dept_biomed',
      departmentName: 'Biomedical Informatics',
      allocatedShareWeight: 2.5,
      maxConcurrentGpus: 32,
      institutionId: 'inst_01',
    });

    const quota = await store.getFairShareQuota('dept_biomed', 'inst_01');
    expect(quota?.allocatedShareWeight).toBe(2.5);

    const account = await store.createBillingAccount({
      accountNumber: 'ACC-GRANT-NSF-2026',
      departmentId: 'dept_biomed',
      grantId: 'NSF-IIS-2026-9812',
      grantTitle: 'Neural Protein Folding Accelerator',
      tokenBalance: 5000.0,
      tokenAllocatedTotal: 5000.0,
      institutionId: 'inst_01',
    });

    const tx = await store.postLedgerTransaction({
      transactionId: 'TX-COMPUTE-001',
      accountId: account.id,
      transactionType: 'compute_debit',
      tokensAmount: 120.0,
      gpuSeconds: 54000,
      balanceAfterTokens: 4880.0,
      description: 'Distributed AlphaFold 3 Training Batch',
      institutionId: 'inst_01',
    });

    const txs = await store.listLedgerTransactions(account.id, 'inst_01');
    expect(txs.length).toBe(1);
    expect(txs[0].tokensAmount).toBe(120.0);
  });
});
