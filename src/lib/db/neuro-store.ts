import { db } from '@thaiba/db';
import {
  neuroClusters,
  neuroNodes,
  neuroGpus,
  neuroJobs,
  neuroJobCheckpoints,
  neuroFairShareQuotas,
  neuroCloudProviders,
  neuroSpotPriceHistory,
  neuroDatasetProvenance,
  neuroMerkleLineageNodes,
  neuroComputeBillingAccounts,
  neuroBillingLedgerTransactions,
  neuroAuditLogs,
} from '@thaiba/db/schema';
import {
  NeuroClusterItem,
  NeuroNodeItem,
  NeuroGpuItem,
  NeuroJobItem,
  NeuroJobCheckpointItem,
  NeuroFairShareQuotaItem,
  NeuroCloudProviderItem,
  NeuroSpotPriceHistoryItem,
  NeuroDatasetProvenanceItem,
  NeuroMerkleLineageNodeItem,
  NeuroComputeBillingAccountItem,
  NeuroGrantCreditAllocationItem,
  NeuroBillingLedgerTransactionItem,
  NeuroAuditLogItem,
  JobStatus,
} from '../operations/neuro/neuro-types';

export interface InMemoryNeuroStore {
  clusters: Map<string, NeuroClusterItem>;
  nodes: Map<string, NeuroNodeItem>;
  gpus: Map<string, NeuroGpuItem>;
  jobs: Map<string, NeuroJobItem>;
  checkpoints: Map<string, NeuroJobCheckpointItem>;
  quotas: Map<string, NeuroFairShareQuotaItem>;
  cloudProviders: Map<string, NeuroCloudProviderItem>;
  spotPrices: Map<string, NeuroSpotPriceHistoryItem>;
  datasets: Map<string, NeuroDatasetProvenanceItem>;
  lineageNodes: Map<string, NeuroMerkleLineageNodeItem>;
  billingAccounts: Map<string, NeuroComputeBillingAccountItem>;
  grantAllocations: Map<string, NeuroGrantCreditAllocationItem>;
  ledgerTransactions: Map<string, NeuroBillingLedgerTransactionItem>;
  auditLogs: Map<string, NeuroAuditLogItem>;
}

export class NeuroDbStore {
  private static instance: NeuroDbStore;
  private memoryStore: InMemoryNeuroStore = {
    clusters: new Map(),
    nodes: new Map(),
    gpus: new Map(),
    jobs: new Map(),
    checkpoints: new Map(),
    quotas: new Map(),
    cloudProviders: new Map(),
    spotPrices: new Map(),
    datasets: new Map(),
    lineageNodes: new Map(),
    billingAccounts: new Map(),
    grantAllocations: new Map(),
    ledgerTransactions: new Map(),
    auditLogs: new Map(),
  };

  public static getInstance(): NeuroDbStore {
    if (!NeuroDbStore.instance) {
      NeuroDbStore.instance = new NeuroDbStore();
    }
    return NeuroDbStore.instance;
  }

  public clearMemoryStore(): void {
    this.memoryStore.clusters.clear();
    this.memoryStore.nodes.clear();
    this.memoryStore.gpus.clear();
    this.memoryStore.jobs.clear();
    this.memoryStore.checkpoints.clear();
    this.memoryStore.quotas.clear();
    this.memoryStore.cloudProviders.clear();
    this.memoryStore.spotPrices.clear();
    this.memoryStore.datasets.clear();
    this.memoryStore.lineageNodes.clear();
    this.memoryStore.billingAccounts.clear();
    this.memoryStore.grantAllocations.clear();
    this.memoryStore.ledgerTransactions.clear();
    this.memoryStore.auditLogs.clear();
  }

  // ─── 1. Clusters ───
  async createCluster(data: Partial<NeuroClusterItem> & { clusterId: string; name: string }): Promise<NeuroClusterItem> {
    const record: NeuroClusterItem = {
      id: data.id || `cluster_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      clusterId: data.clusterId,
      name: data.name,
      description: data.description || null,
      clusterType: data.clusterType || 'hybrid',
      schedulerType: data.schedulerType || 'slurm',
      region: data.region || 'local-dc-1',
      totalNodes: data.totalNodes || 0,
      totalGpus: data.totalGpus || 0,
      activeJobsCount: data.activeJobsCount || 0,
      status: data.status || 'active',
      networkTopology: data.networkTopology || 'infiniband_fat_tree',
      configJson: data.configJson || null,
      institutionId: data.institutionId || 'global',
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    this.memoryStore.clusters.set(record.id, record);
    this.memoryStore.clusters.set(record.clusterId, record);
    try {
      if (db) await db.insert(neuroClusters).values(record as any);
    } catch {}
    return record;
  }

  async getClusterById(idOrClusterId: string, tenantId: string = 'global'): Promise<NeuroClusterItem | null> {
    const item = this.memoryStore.clusters.get(idOrClusterId);
    if (item && item.institutionId === tenantId) return item;
    for (const val of this.memoryStore.clusters.values()) {
      if ((val.id === idOrClusterId || val.clusterId === idOrClusterId) && val.institutionId === tenantId) {
        return val;
      }
    }
    return null;
  }

  async listClusters(tenantId: string = 'global'): Promise<NeuroClusterItem[]> {
    const unique = new Map<string, NeuroClusterItem>();
    for (const item of this.memoryStore.clusters.values()) {
      if (item.institutionId === tenantId) unique.set(item.id, item);
    }
    return Array.from(unique.values());
  }

  async updateCluster(idOrClusterId: string, updates: Partial<NeuroClusterItem>, tenantId: string = 'global'): Promise<NeuroClusterItem | null> {
    const cluster = await this.getClusterById(idOrClusterId, tenantId);
    if (!cluster) return null;
    const updated: NeuroClusterItem = {
      ...cluster,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.memoryStore.clusters.set(updated.id, updated);
    this.memoryStore.clusters.set(updated.clusterId, updated);
    return updated;
  }

  // ─── 2. Compute Nodes ───
  async createNode(data: Partial<NeuroNodeItem> & { nodeId: string; clusterId: string; hostname: string; ipAddress: string }): Promise<NeuroNodeItem> {
    const record: NeuroNodeItem = {
      id: data.id || `node_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      nodeId: data.nodeId,
      clusterId: data.clusterId,
      hostname: data.hostname,
      ipAddress: data.ipAddress,
      rackLocation: data.rackLocation || null,
      chassisSlot: data.chassisSlot || null,
      nodeType: data.nodeType || 'compute',
      cpuCores: data.cpuCores ?? 64,
      ramBytes: data.ramBytes ?? 549755813888,
      gpuCount: data.gpuCount ?? 8,
      gpuModel: data.gpuModel || 'NVIDIA-H100-SXM5-80GB',
      status: data.status || 'ready',
      isCloudBurst: data.isCloudBurst ?? false,
      cloudProvider: data.cloudProvider || 'on_prem',
      spotInstanceId: data.spotInstanceId || null,
      currentPowerWatts: data.currentPowerWatts ?? 0.0,
      temperatureCelsius: data.temperatureCelsius ?? 35.0,
      institutionId: data.institutionId || 'global',
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    this.memoryStore.nodes.set(record.id, record);
    this.memoryStore.nodes.set(record.nodeId, record);
    try {
      if (db) await db.insert(neuroNodes).values(record as any);
    } catch {}
    return record;
  }

  async getNodeById(idOrNodeId: string, tenantId: string = 'global'): Promise<NeuroNodeItem | null> {
    const item = this.memoryStore.nodes.get(idOrNodeId);
    if (item && item.institutionId === tenantId) return item;
    for (const val of this.memoryStore.nodes.values()) {
      if ((val.id === idOrNodeId || val.nodeId === idOrNodeId) && val.institutionId === tenantId) {
        return val;
      }
    }
    return null;
  }

  async listNodes(clusterId?: string, tenantId: string = 'global'): Promise<NeuroNodeItem[]> {
    const unique = new Map<string, NeuroNodeItem>();
    for (const item of this.memoryStore.nodes.values()) {
      if (item.institutionId === tenantId) {
        if (!clusterId || item.clusterId === clusterId) {
          unique.set(item.id, item);
        }
      }
    }
    return Array.from(unique.values());
  }

  async updateNode(idOrNodeId: string, updates: Partial<NeuroNodeItem>, tenantId: string = 'global'): Promise<NeuroNodeItem | null> {
    const node = await this.getNodeById(idOrNodeId, tenantId);
    if (!node) return null;
    const updated: NeuroNodeItem = {
      ...node,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.memoryStore.nodes.set(updated.id, updated);
    this.memoryStore.nodes.set(updated.nodeId, updated);
    return updated;
  }

  // ─── 3. GPUs ───
  async createGpu(data: Partial<NeuroGpuItem> & { gpuId: string; nodeId: string }): Promise<NeuroGpuItem> {
    const record: NeuroGpuItem = {
      id: data.id || `gpu_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      gpuId: data.gpuId,
      nodeId: data.nodeId,
      gpuIndex: data.gpuIndex ?? 0,
      model: data.model || 'NVIDIA-H100-SXM5-80GB',
      vramTotalBytes: data.vramTotalBytes ?? 85899345920,
      vramAllocatedBytes: data.vramAllocatedBytes ?? 0,
      utilizationPercent: data.utilizationPercent ?? 0.0,
      temperatureCelsius: data.temperatureCelsius ?? 40.0,
      powerDrawWatts: data.powerDrawWatts ?? 150.0,
      smClockMhz: data.smClockMhz ?? 1980,
      memoryClockMhz: data.memoryClockMhz ?? 1593,
      pcieBandwidthGbps: data.pcieBandwidthGbps ?? 64.0,
      nvlinkActive: data.nvlinkActive ?? true,
      numaNode: data.numaNode ?? 0,
      status: data.status || 'idle',
      currentJobId: data.currentJobId || null,
      institutionId: data.institutionId || 'global',
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    this.memoryStore.gpus.set(record.id, record);
    this.memoryStore.gpus.set(record.gpuId, record);
    try {
      if (db) await db.insert(neuroGpus).values(record as any);
    } catch {}
    return record;
  }

  async getGpuById(idOrGpuId: string, tenantId: string = 'global'): Promise<NeuroGpuItem | null> {
    const item = this.memoryStore.gpus.get(idOrGpuId);
    if (item && item.institutionId === tenantId) return item;
    for (const val of this.memoryStore.gpus.values()) {
      if ((val.id === idOrGpuId || val.gpuId === idOrGpuId) && val.institutionId === tenantId) {
        return val;
      }
    }
    return null;
  }

  async listGpus(nodeId?: string, tenantId: string = 'global'): Promise<NeuroGpuItem[]> {
    const unique = new Map<string, NeuroGpuItem>();
    for (const item of this.memoryStore.gpus.values()) {
      if (item.institutionId === tenantId) {
        if (!nodeId || item.nodeId === nodeId) {
          unique.set(item.id, item);
        }
      }
    }
    return Array.from(unique.values());
  }

  async updateGpu(idOrGpuId: string, updates: Partial<NeuroGpuItem>, tenantId: string = 'global'): Promise<NeuroGpuItem | null> {
    const gpu = await this.getGpuById(idOrGpuId, tenantId);
    if (!gpu) return null;
    const updated: NeuroGpuItem = {
      ...gpu,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.memoryStore.gpus.set(updated.id, updated);
    this.memoryStore.gpus.set(updated.gpuId, updated);
    return updated;
  }

  // ─── 4. Jobs ───
  async createJob(data: Partial<NeuroJobItem> & { jobId: string; jobName: string; userId: string; departmentId: string; clusterId: string }): Promise<NeuroJobItem> {
    const record: NeuroJobItem = {
      id: data.id || `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      jobId: data.jobId,
      jobName: data.jobName,
      userId: data.userId,
      departmentId: data.departmentId,
      grantId: data.grantId || null,
      clusterId: data.clusterId,
      jobType: data.jobType || 'distributed_training',
      priority: data.priority || 'normal',
      status: data.status || 'pending',
      requestedGpus: data.requestedGpus ?? 1,
      gpuModelRequirement: data.gpuModelRequirement || 'ANY',
      minVramBytes: data.minVramBytes ?? 25769803776,
      containerImage: data.containerImage || 'pytorch/pytorch:2.4.0-cuda12.4-cudnn9-runtime',
      entrypointCommand: data.entrypointCommand || 'python train.py',
      allocatedNodesJson: data.allocatedNodesJson || null,
      allocatedGpuIdsJson: data.allocatedGpuIdsJson || null,
      queuedAt: data.queuedAt || new Date().toISOString(),
      startedAt: data.startedAt || null,
      completedAt: data.completedAt || null,
      runtimeSeconds: data.runtimeSeconds ?? 0,
      exitCode: data.exitCode ?? null,
      errorMessage: data.errorMessage || null,
      tokensCostTotal: data.tokensCostTotal ?? 0.0,
      carbonSavedKg: data.carbonSavedKg ?? 0.0,
      merkleProofHash: data.merkleProofHash || '',
      institutionId: data.institutionId || 'global',
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    this.memoryStore.jobs.set(record.id, record);
    this.memoryStore.jobs.set(record.jobId, record);
    try {
      if (db) await db.insert(neuroJobs).values(record as any);
    } catch {}
    return record;
  }

  async getJobById(idOrJobId: string, tenantId: string = 'global'): Promise<NeuroJobItem | null> {
    const item = this.memoryStore.jobs.get(idOrJobId);
    if (item && item.institutionId === tenantId) return item;
    for (const val of this.memoryStore.jobs.values()) {
      if ((val.id === idOrJobId || val.jobId === idOrJobId) && val.institutionId === tenantId) {
        return val;
      }
    }
    return null;
  }

  async listJobs(filters?: { status?: JobStatus; departmentId?: string; userId?: string }, tenantId: string = 'global'): Promise<NeuroJobItem[]> {
    const unique = new Map<string, NeuroJobItem>();
    for (const item of this.memoryStore.jobs.values()) {
      if (item.institutionId === tenantId) {
        if (filters?.status && item.status !== filters.status) continue;
        if (filters?.departmentId && item.departmentId !== filters.departmentId) continue;
        if (filters?.userId && item.userId !== filters.userId) continue;
        unique.set(item.id, item);
      }
    }
    return Array.from(unique.values());
  }

  async updateJob(idOrJobId: string, updates: Partial<NeuroJobItem>, tenantId: string = 'global'): Promise<NeuroJobItem | null> {
    const job = await this.getJobById(idOrJobId, tenantId);
    if (!job) return null;
    const updated: NeuroJobItem = {
      ...job,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.memoryStore.jobs.set(updated.id, updated);
    this.memoryStore.jobs.set(updated.jobId, updated);
    return updated;
  }

  // ─── 5. Checkpoints ───
  async createCheckpoint(data: Partial<NeuroJobCheckpointItem> & { checkpointId: string; jobId: string; storageUri: string; sha256Hash: string }): Promise<NeuroJobCheckpointItem> {
    const record: NeuroJobCheckpointItem = {
      id: data.id || `chk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      checkpointId: data.checkpointId,
      jobId: data.jobId,
      stepNumber: data.stepNumber ?? 0,
      epochNumber: data.epochNumber ?? 0,
      lossValue: data.lossValue ?? null,
      metricsJson: data.metricsJson || null,
      storageUri: data.storageUri,
      fileSizeBytes: data.fileSizeBytes ?? 0,
      sha256Hash: data.sha256Hash,
      isPreemptionEmergency: data.isPreemptionEmergency ?? false,
      restoredCount: data.restoredCount ?? 0,
      institutionId: data.institutionId || 'global',
      createdAt: data.createdAt || new Date().toISOString(),
    };
    this.memoryStore.checkpoints.set(record.id, record);
    this.memoryStore.checkpoints.set(record.checkpointId, record);
    try {
      if (db) await db.insert(neuroJobCheckpoints).values(record as any);
    } catch {}
    return record;
  }

  async listCheckpoints(jobId?: string, tenantId: string = 'global'): Promise<NeuroJobCheckpointItem[]> {
    const unique = new Map<string, NeuroJobCheckpointItem>();
    for (const item of this.memoryStore.checkpoints.values()) {
      if (item.institutionId === tenantId) {
        if (!jobId || item.jobId === jobId) {
          unique.set(item.id, item);
        }
      }
    }
    return Array.from(unique.values()).sort((a, b) => b.stepNumber - a.stepNumber);
  }

  // ─── 6. Fair-Share Quotas ───
  async setFairShareQuota(data: Partial<NeuroFairShareQuotaItem> & { departmentId: string; departmentName: string }): Promise<NeuroFairShareQuotaItem> {
    const existing = this.memoryStore.quotas.get(data.departmentId);
    const record: NeuroFairShareQuotaItem = {
      id: existing?.id || data.id || `quota_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      departmentId: data.departmentId,
      departmentName: data.departmentName,
      allocatedShareWeight: data.allocatedShareWeight ?? existing?.allocatedShareWeight ?? 1.0,
      maxConcurrentGpus: data.maxConcurrentGpus ?? existing?.maxConcurrentGpus ?? 16,
      historicalUsageDecayed: data.historicalUsageDecayed ?? existing?.historicalUsageDecayed ?? 0.0,
      fairShareScore: data.fairShareScore ?? existing?.fairShareScore ?? 1.0,
      activeAllocatedGpus: data.activeAllocatedGpus ?? existing?.activeAllocatedGpus ?? 0,
      pendingJobsCount: data.pendingJobsCount ?? existing?.pendingJobsCount ?? 0,
      halfLifeDecayFactor: data.halfLifeDecayFactor ?? existing?.halfLifeDecayFactor ?? 0.95,
      institutionId: data.institutionId || existing?.institutionId || 'global',
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.memoryStore.quotas.set(record.departmentId, record);
    this.memoryStore.quotas.set(record.id, record);
    try {
      if (db) await db.insert(neuroFairShareQuotas).values(record as any);
    } catch {}
    return record;
  }

  async getFairShareQuota(departmentId: string, tenantId: string = 'global'): Promise<NeuroFairShareQuotaItem | null> {
    const item = this.memoryStore.quotas.get(departmentId);
    if (item && item.institutionId === tenantId) return item;
    return null;
  }

  async listFairShareQuotas(tenantId: string = 'global'): Promise<NeuroFairShareQuotaItem[]> {
    const unique = new Map<string, NeuroFairShareQuotaItem>();
    for (const item of this.memoryStore.quotas.values()) {
      if (item.institutionId === tenantId) unique.set(item.departmentId, item);
    }
    return Array.from(unique.values());
  }

  // ─── 7. Cloud Providers & Spot Prices ───
  async registerCloudProvider(data: Partial<NeuroCloudProviderItem> & { providerKey: string; providerName: string }): Promise<NeuroCloudProviderItem> {
    const record: NeuroCloudProviderItem = {
      id: data.id || `prov_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      providerKey: data.providerKey,
      providerName: data.providerName,
      isEnabled: data.isEnabled ?? true,
      apiEndpoint: data.apiEndpoint || null,
      region: data.region || 'us-east-1',
      maxSpotInstances: data.maxSpotInstances ?? 10,
      currentActiveInstances: data.currentActiveInstances ?? 0,
      maxPriceUsdPerHour: data.maxPriceUsdPerHour ?? 4.50,
      autoArbitrageThresholdDelta: data.autoArbitrageThresholdDelta ?? 0.25,
      interruptionGraceSeconds: data.interruptionGraceSeconds ?? 120,
      institutionId: data.institutionId || 'global',
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    this.memoryStore.cloudProviders.set(record.providerKey, record);
    this.memoryStore.cloudProviders.set(record.id, record);
    try {
      if (db) await db.insert(neuroCloudProviders).values(record as any);
    } catch {}
    return record;
  }

  async listCloudProviders(tenantId: string = 'global'): Promise<NeuroCloudProviderItem[]> {
    const unique = new Map<string, NeuroCloudProviderItem>();
    for (const item of this.memoryStore.cloudProviders.values()) {
      if (item.institutionId === tenantId) unique.set(item.providerKey, item);
    }
    return Array.from(unique.values());
  }

  async recordSpotPrice(data: Partial<NeuroSpotPriceHistoryItem> & { provider: string; region: string; gpuModel: string; instanceType: string; spotPriceUsd: number; onDemandPriceUsd: number }): Promise<NeuroSpotPriceHistoryItem> {
    const discount = data.onDemandPriceUsd > 0 ? ((data.onDemandPriceUsd - data.spotPriceUsd) / data.onDemandPriceUsd) * 100 : 0;
    const record: NeuroSpotPriceHistoryItem = {
      id: data.id || `spot_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      provider: data.provider,
      region: data.region,
      gpuModel: data.gpuModel,
      instanceType: data.instanceType,
      spotPriceUsd: data.spotPriceUsd,
      onDemandPriceUsd: data.onDemandPriceUsd,
      discountPercent: Number(discount.toFixed(2)),
      interruptionRiskScore: data.interruptionRiskScore ?? 0.1,
      recordedAt: data.recordedAt || new Date().toISOString(),
      institutionId: data.institutionId || 'global',
      createdAt: data.createdAt || new Date().toISOString(),
    };
    this.memoryStore.spotPrices.set(record.id, record);
    try {
      if (db) await db.insert(neuroSpotPriceHistory).values(record as any);
    } catch {}
    return record;
  }

  async getLatestSpotPrices(tenantId: string = 'global'): Promise<NeuroSpotPriceHistoryItem[]> {
    const latestMap = new Map<string, NeuroSpotPriceHistoryItem>();
    for (const item of this.memoryStore.spotPrices.values()) {
      if (item.institutionId === tenantId) {
        const key = `${item.provider}_${item.gpuModel}`;
        const prev = latestMap.get(key);
        if (!prev || new Date(item.recordedAt) > new Date(prev.recordedAt)) {
          latestMap.set(key, item);
        }
      }
    }
    return Array.from(latestMap.values());
  }

  // ─── 8. Dataset Provenance & Merkle Lineage ───
  async createDataset(data: Partial<NeuroDatasetProvenanceItem> & { datasetId: string; name: string; sourceUri: string; manifestSha256: string; rootMerkleHash: string }): Promise<NeuroDatasetProvenanceItem> {
    const record: NeuroDatasetProvenanceItem = {
      id: data.id || `ds_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      datasetId: data.datasetId,
      name: data.name,
      version: data.version || '1.0.0',
      description: data.description || null,
      sourceUri: data.sourceUri,
      fileCount: data.fileCount ?? 1,
      totalSizeBytes: data.totalSizeBytes ?? 0,
      manifestSha256: data.manifestSha256,
      rootMerkleHash: data.rootMerkleHash,
      license: data.license || 'MIT',
      nsfNihGrantTagged: data.nsfNihGrantTagged || null,
      containsPiiPhi: data.containsPiiPhi ?? false,
      isSealed: data.isSealed ?? false,
      sealedAt: data.sealedAt || null,
      sealedByUserId: data.sealedByUserId || null,
      institutionId: data.institutionId || 'global',
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    this.memoryStore.datasets.set(record.id, record);
    this.memoryStore.datasets.set(record.datasetId, record);
    try {
      if (db) await db.insert(neuroDatasetProvenance).values(record as any);
    } catch {}
    return record;
  }

  async getDatasetById(idOrDatasetId: string, tenantId: string = 'global'): Promise<NeuroDatasetProvenanceItem | null> {
    const item = this.memoryStore.datasets.get(idOrDatasetId);
    if (item && item.institutionId === tenantId) return item;
    for (const val of this.memoryStore.datasets.values()) {
      if ((val.id === idOrDatasetId || val.datasetId === idOrDatasetId) && val.institutionId === tenantId) {
        return val;
      }
    }
    return null;
  }

  async listDatasets(tenantId: string = 'global'): Promise<NeuroDatasetProvenanceItem[]> {
    const unique = new Map<string, NeuroDatasetProvenanceItem>();
    for (const item of this.memoryStore.datasets.values()) {
      if (item.institutionId === tenantId) unique.set(item.id, item);
    }
    return Array.from(unique.values());
  }

  async addLineageNode(data: Partial<NeuroMerkleLineageNodeItem> & { nodeHash: string; entityType: any; entityId: string; metadataJson: string; timestamp: string }): Promise<NeuroMerkleLineageNodeItem> {
    const record: NeuroMerkleLineageNodeItem = {
      id: data.id || `lin_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      nodeHash: data.nodeHash,
      parentNodeHash: data.parentNodeHash || null,
      entityType: data.entityType,
      entityId: data.entityId,
      jobId: data.jobId || null,
      datasetId: data.datasetId || null,
      metadataJson: data.metadataJson,
      provOType: data.provOType || 'prov:Entity',
      inclusionProofJson: data.inclusionProofJson || null,
      timestamp: data.timestamp,
      institutionId: data.institutionId || 'global',
      createdAt: data.createdAt || new Date().toISOString(),
    };
    this.memoryStore.lineageNodes.set(record.nodeHash, record);
    this.memoryStore.lineageNodes.set(record.id, record);
    try {
      if (db) await db.insert(neuroMerkleLineageNodes).values(record as any);
    } catch {}
    return record;
  }

  async listLineageNodes(jobId?: string, datasetId?: string, tenantId: string = 'global'): Promise<NeuroMerkleLineageNodeItem[]> {
    const unique = new Map<string, NeuroMerkleLineageNodeItem>();
    for (const item of this.memoryStore.lineageNodes.values()) {
      if (item.institutionId === tenantId) {
        if (jobId && item.jobId !== jobId) continue;
        if (datasetId && item.datasetId !== datasetId) continue;
        unique.set(item.nodeHash, item);
      }
    }
    return Array.from(unique.values());
  }

  // ─── 9. Compute Billing & Grant Accounts ───
  async createBillingAccount(data: Partial<NeuroComputeBillingAccountItem> & { accountNumber: string; departmentId: string }): Promise<NeuroComputeBillingAccountItem> {
    const record: NeuroComputeBillingAccountItem = {
      id: data.id || `acc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      accountNumber: data.accountNumber,
      departmentId: data.departmentId,
      grantId: data.grantId || null,
      grantTitle: data.grantTitle || null,
      principalInvestigatorId: data.principalInvestigatorId || null,
      tokenBalance: data.tokenBalance ?? 1000.0,
      tokenAllocatedTotal: data.tokenAllocatedTotal ?? 1000.0,
      tokenSpentTotal: data.tokenSpentTotal ?? 0.0,
      softCapPercent: data.softCapPercent ?? 80.0,
      hardCapTokens: data.hardCapTokens ?? 1000.0,
      isHardCapLocked: data.isHardCapLocked ?? false,
      expiresAt: data.expiresAt || null,
      status: data.status || 'active',
      institutionId: data.institutionId || 'global',
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    this.memoryStore.billingAccounts.set(record.id, record);
    this.memoryStore.billingAccounts.set(record.accountNumber, record);
    try {
      if (db) await db.insert(neuroComputeBillingAccounts).values(record as any);
    } catch {}
    return record;
  }

  async getBillingAccountById(idOrAccountNumber: string, tenantId: string = 'global'): Promise<NeuroComputeBillingAccountItem | null> {
    const item = this.memoryStore.billingAccounts.get(idOrAccountNumber);
    if (item && item.institutionId === tenantId) return item;
    for (const val of this.memoryStore.billingAccounts.values()) {
      if ((val.id === idOrAccountNumber || val.accountNumber === idOrAccountNumber) && val.institutionId === tenantId) {
        return val;
      }
    }
    return null;
  }

  async listBillingAccounts(departmentId?: string, tenantId: string = 'global'): Promise<NeuroComputeBillingAccountItem[]> {
    const unique = new Map<string, NeuroComputeBillingAccountItem>();
    for (const item of this.memoryStore.billingAccounts.values()) {
      if (item.institutionId === tenantId) {
        if (!departmentId || item.departmentId === departmentId) {
          unique.set(item.id, item);
        }
      }
    }
    return Array.from(unique.values());
  }

  async postLedgerTransaction(data: Partial<NeuroBillingLedgerTransactionItem> & { transactionId: string; accountId: string; tokensAmount: number; balanceAfterTokens: number; description: string }): Promise<NeuroBillingLedgerTransactionItem> {
    const record: NeuroBillingLedgerTransactionItem = {
      id: data.id || `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      transactionId: data.transactionId,
      accountId: data.accountId,
      jobId: data.jobId || null,
      transactionType: data.transactionType || 'compute_debit',
      tokensAmount: data.tokensAmount,
      gpuSeconds: data.gpuSeconds ?? 0,
      gpuModelRateApplied: data.gpuModelRateApplied || null,
      debitAccountCode: data.debitAccountCode || 'EXPENSE:GRANT_COMPUTE',
      creditAccountCode: data.creditAccountCode || 'REVENUE:HPC_CLUSTER_OPS',
      balanceAfterTokens: data.balanceAfterTokens,
      description: data.description,
      merkleLeafHash: data.merkleLeafHash || '',
      institutionId: data.institutionId || 'global',
      createdAt: data.createdAt || new Date().toISOString(),
    };
    this.memoryStore.ledgerTransactions.set(record.id, record);
    this.memoryStore.ledgerTransactions.set(record.transactionId, record);
    try {
      if (db) await db.insert(neuroBillingLedgerTransactions).values(record as any);
    } catch {}
    return record;
  }

  async listLedgerTransactions(accountId?: string, tenantId: string = 'global'): Promise<NeuroBillingLedgerTransactionItem[]> {
    const unique = new Map<string, NeuroBillingLedgerTransactionItem>();
    for (const item of this.memoryStore.ledgerTransactions.values()) {
      if (item.institutionId === tenantId) {
        if (!accountId || item.accountId === accountId) {
          unique.set(item.id, item);
        }
      }
    }
    return Array.from(unique.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // ─── 10. Audit Logs ───
  async appendAuditLog(data: Partial<NeuroAuditLogItem> & { auditId: string; actorId: string; actorRole: string; action: string; entityType: string; entityId: string; payloadHash: string; timestamp: string }): Promise<NeuroAuditLogItem> {
    const record: NeuroAuditLogItem = {
      id: data.id || `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      auditId: data.auditId,
      actorId: data.actorId,
      actorRole: data.actorRole,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      payloadHash: data.payloadHash,
      prevMerkleRoot: data.prevMerkleRoot || '',
      merkleRoot: data.merkleRoot || '',
      timestamp: data.timestamp,
      institutionId: data.institutionId || 'global',
      createdAt: data.createdAt || new Date().toISOString(),
    };
    this.memoryStore.auditLogs.set(record.id, record);
    this.memoryStore.auditLogs.set(record.auditId, record);
    try {
      if (db) await db.insert(neuroAuditLogs).values(record as any);
    } catch {}
    return record;
  }

  async listAuditLogs(entityId?: string, tenantId: string = 'global'): Promise<NeuroAuditLogItem[]> {
    const unique = new Map<string, NeuroAuditLogItem>();
    for (const item of this.memoryStore.auditLogs.values()) {
      if (item.institutionId === tenantId) {
        if (!entityId || item.entityId === entityId) {
          unique.set(item.id, item);
        }
      }
    }
    return Array.from(unique.values()).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
}

export const neuroStore = NeuroDbStore.getInstance();
