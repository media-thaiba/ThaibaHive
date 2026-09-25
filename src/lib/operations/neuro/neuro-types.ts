/**
 * NEURO-CLUSTER / ResearchCompute OS Domain Types
 * Sprint-053 — High-Performance Autonomous Research Computing
 */

export type ClusterType = 'on_premise' | 'cloud' | 'hybrid';
export type SchedulerType = 'slurm' | 'k8s' | 'native';
export type ClusterStatus = 'active' | 'maintenance' | 'degraded' | 'offline';
export type NetworkTopology = 'infiniband_fat_tree' | 'roce_v2' | 'ethernet_100g';

export type NodeType = 'compute' | 'head_node' | 'storage' | 'login';
export type NodeStatus = 'ready' | 'busy' | 'draining' | 'cordoned' | 'offline';
export type CloudProviderType = 'aws' | 'gcp' | 'runpod' | 'on_prem';

export type GpuStatus = 'idle' | 'allocated' | 'error' | 'offline';
export type JobType = 'interactive_notebook' | 'batch_training' | 'distributed_training' | 'inference_service' | 'eval_benchmark';
export type JobPriority = 'low' | 'normal' | 'high' | 'urgent' | 'preemptible';
export type JobStatus = 'pending' | 'queued' | 'running' | 'checkpointing' | 'completed' | 'failed' | 'cancelled' | 'preempted';

export type FundingAgency = 'NSF' | 'NIH' | 'DOE' | 'DARPA' | 'INSTITUTIONAL';
export type BillingAccountStatus = 'active' | 'warning' | 'suspended' | 'expired';
export type LedgerTransactionType = 'compute_debit' | 'grant_credit' | 'quota_adjustment' | 'refund';
export type LineageEntityType = 'raw_dataset' | 'preprocessed_shard' | 'model_architecture' | 'hyperparameters' | 'training_epoch' | 'checkpoint_weights';

export interface NeuroClusterItem {
  id: string;
  clusterId: string;
  name: string;
  description?: string | null;
  clusterType: ClusterType;
  schedulerType: SchedulerType;
  region: string;
  totalNodes: number;
  totalGpus: number;
  activeJobsCount: number;
  status: ClusterStatus;
  networkTopology: NetworkTopology;
  configJson?: string | null;
  institutionId: string;
  createdAt: string;
  updatedAt: string;
}

export interface NeuroNodeItem {
  id: string;
  nodeId: string;
  clusterId: string;
  hostname: string;
  ipAddress: string;
  rackLocation?: string | null;
  chassisSlot?: number | null;
  nodeType: NodeType;
  cpuCores: number;
  ramBytes: number;
  gpuCount: number;
  gpuModel: string;
  status: NodeStatus;
  isCloudBurst: boolean;
  cloudProvider: CloudProviderType;
  spotInstanceId?: string | null;
  currentPowerWatts: number;
  temperatureCelsius: number;
  institutionId: string;
  createdAt: string;
  updatedAt: string;
}

export interface NeuroGpuItem {
  id: string;
  gpuId: string;
  nodeId: string;
  gpuIndex: number;
  model: string;
  vramTotalBytes: number;
  vramAllocatedBytes: number;
  utilizationPercent: number;
  temperatureCelsius: number;
  powerDrawWatts: number;
  smClockMhz: number;
  memoryClockMhz: number;
  pcieBandwidthGbps: number;
  nvlinkActive: boolean;
  numaNode: number;
  status: GpuStatus;
  currentJobId?: string | null;
  institutionId: string;
  createdAt: string;
  updatedAt: string;
}

export interface NeuroJobItem {
  id: string;
  jobId: string;
  jobName: string;
  userId: string;
  departmentId: string;
  grantId?: string | null;
  clusterId: string;
  jobType: JobType;
  priority: JobPriority;
  status: JobStatus;
  requestedGpus: number;
  gpuModelRequirement: string;
  minVramBytes: number;
  containerImage: string;
  entrypointCommand: string;
  allocatedNodesJson?: string | null;
  allocatedGpuIdsJson?: string | null;
  queuedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  runtimeSeconds: number;
  exitCode?: number | null;
  errorMessage?: string | null;
  tokensCostTotal: number;
  carbonSavedKg: number;
  merkleProofHash: string;
  institutionId: string;
  createdAt: string;
  updatedAt: string;
}

export interface NeuroJobCheckpointItem {
  id: string;
  checkpointId: string;
  jobId: string;
  stepNumber: number;
  epochNumber: number;
  lossValue?: number | null;
  metricsJson?: string | null;
  storageUri: string;
  fileSizeBytes: number;
  sha256Hash: string;
  isPreemptionEmergency: boolean;
  restoredCount: number;
  institutionId: string;
  createdAt: string;
}

export interface NeuroFairShareQuotaItem {
  id: string;
  departmentId: string;
  departmentName: string;
  allocatedShareWeight: number;
  maxConcurrentGpus: number;
  historicalUsageDecayed: number;
  fairShareScore: number;
  activeAllocatedGpus: number;
  pendingJobsCount: number;
  halfLifeDecayFactor: number;
  institutionId: string;
  createdAt: string;
  updatedAt: string;
}

export interface NeuroCloudProviderItem {
  id: string;
  providerKey: string;
  providerName: string;
  isEnabled: boolean;
  apiEndpoint?: string | null;
  region: string;
  maxSpotInstances: number;
  currentActiveInstances: number;
  maxPriceUsdPerHour: number;
  autoArbitrageThresholdDelta: number;
  interruptionGraceSeconds: number;
  institutionId: string;
  createdAt: string;
  updatedAt: string;
}

export interface NeuroSpotPriceHistoryItem {
  id: string;
  provider: string;
  region: string;
  gpuModel: string;
  instanceType: string;
  spotPriceUsd: number;
  onDemandPriceUsd: number;
  discountPercent: number;
  interruptionRiskScore: number;
  recordedAt: string;
  institutionId: string;
  createdAt: string;
}

export interface NeuroDatasetProvenanceItem {
  id: string;
  datasetId: string;
  name: string;
  version: string;
  description?: string | null;
  sourceUri: string;
  fileCount: number;
  totalSizeBytes: number;
  manifestSha256: string;
  rootMerkleHash: string;
  license: string;
  nsfNihGrantTagged?: string | null;
  containsPiiPhi: boolean;
  isSealed: boolean;
  sealedAt?: string | null;
  sealedByUserId?: string | null;
  institutionId: string;
  createdAt: string;
  updatedAt: string;
}

export interface NeuroMerkleLineageNodeItem {
  id: string;
  nodeHash: string;
  parentNodeHash?: string | null;
  entityType: LineageEntityType;
  entityId: string;
  jobId?: string | null;
  datasetId?: string | null;
  metadataJson: string;
  provOType: string;
  inclusionProofJson?: string | null;
  timestamp: string;
  institutionId: string;
  createdAt: string;
}

export interface NeuroComputeBillingAccountItem {
  id: string;
  accountNumber: string;
  departmentId: string;
  grantId?: string | null;
  grantTitle?: string | null;
  principalInvestigatorId?: string | null;
  tokenBalance: number;
  tokenAllocatedTotal: number;
  tokenSpentTotal: number;
  softCapPercent: number;
  hardCapTokens: number;
  isHardCapLocked: boolean;
  expiresAt?: string | null;
  status: BillingAccountStatus;
  institutionId: string;
  createdAt: string;
  updatedAt: string;
}

export interface NeuroGrantCreditAllocationItem {
  id: string;
  allocationId: string;
  accountId: string;
  grantNumber: string;
  fundingAgency: FundingAgency;
  creditedTokens: number;
  dollarEquivalentUsd: number;
  allocatedByUserId: string;
  effectiveDate: string;
  expiryDate: string;
  auditNotes?: string | null;
  institutionId: string;
  createdAt: string;
}

export interface NeuroBillingLedgerTransactionItem {
  id: string;
  transactionId: string;
  accountId: string;
  jobId?: string | null;
  transactionType: LedgerTransactionType;
  tokensAmount: number;
  gpuSeconds: number;
  gpuModelRateApplied?: string | null;
  debitAccountCode: string;
  creditAccountCode: string;
  balanceAfterTokens: number;
  description: string;
  merkleLeafHash: string;
  institutionId: string;
  createdAt: string;
}

export interface NeuroAuditLogItem {
  id: string;
  auditId: string;
  actorId: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  payloadHash: string;
  prevMerkleRoot: string;
  merkleRoot: string;
  timestamp: string;
  institutionId: string;
  createdAt: string;
}
