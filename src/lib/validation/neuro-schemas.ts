import { z } from 'zod';

export const clusterCreateSchema = z.object({
  clusterId: z.string().min(2),
  name: z.string().min(2),
  description: z.string().optional().nullable(),
  clusterType: z.enum(['on_premise', 'cloud', 'hybrid']).default('hybrid'),
  schedulerType: z.enum(['slurm', 'k8s', 'native']).default('slurm'),
  region: z.string().default('local-dc-1'),
  totalNodes: z.number().int().nonnegative().default(0),
  totalGpus: z.number().int().nonnegative().default(0),
  networkTopology: z.enum(['infiniband_fat_tree', 'roce_v2', 'ethernet_100g']).default('infiniband_fat_tree'),
  configJson: z.string().optional().nullable(),
  institutionId: z.string().default('global'),
});

export const nodeCreateSchema = z.object({
  nodeId: z.string().min(2),
  clusterId: z.string().min(1),
  hostname: z.string().min(2),
  ipAddress: z.string().min(3),
  rackLocation: z.string().optional().nullable(),
  chassisSlot: z.number().int().optional().nullable(),
  nodeType: z.enum(['compute', 'head_node', 'storage', 'login']).default('compute'),
  cpuCores: z.number().int().positive().default(64),
  ramBytes: z.number().positive().default(549755813888),
  gpuCount: z.number().int().nonnegative().default(8),
  gpuModel: z.string().default('NVIDIA-H100-SXM5-80GB'),
  isCloudBurst: z.boolean().default(false),
  cloudProvider: z.enum(['aws', 'gcp', 'runpod', 'on_prem']).default('on_prem'),
  spotInstanceId: z.string().optional().nullable(),
  institutionId: z.string().default('global'),
});

export const gpuCreateSchema = z.object({
  gpuId: z.string().min(2),
  nodeId: z.string().min(1),
  gpuIndex: z.number().int().nonnegative().default(0),
  model: z.string().default('NVIDIA-H100-SXM5-80GB'),
  vramTotalBytes: z.number().positive().default(85899345920),
  vramAllocatedBytes: z.number().nonnegative().default(0),
  utilizationPercent: z.number().min(0).max(100).default(0.0),
  temperatureCelsius: z.number().default(40.0),
  powerDrawWatts: z.number().default(150.0),
  nvlinkActive: z.boolean().default(true),
  status: z.enum(['idle', 'allocated', 'error', 'offline']).default('idle'),
  institutionId: z.string().default('global'),
});

export const jobSubmitSchema = z.object({
  jobName: z.string().min(2),
  departmentId: z.string().min(1),
  grantId: z.string().optional().nullable(),
  clusterId: z.string().min(1),
  jobType: z.enum(['interactive_notebook', 'batch_training', 'distributed_training', 'inference_service', 'eval_benchmark']).default('distributed_training'),
  priority: z.enum(['low', 'normal', 'high', 'urgent', 'preemptible']).default('normal'),
  requestedGpus: z.number().int().positive().default(1),
  gpuModelRequirement: z.string().default('ANY'),
  minVramBytes: z.number().positive().default(25769803776),
  containerImage: z.string().default('pytorch/pytorch:2.4.0-cuda12.4-cudnn9-runtime'),
  entrypointCommand: z.string().default('python train.py'),
  institutionId: z.string().default('global'),
});

export const jobUpdateSchema = z.object({
  status: z.enum(['pending', 'queued', 'running', 'checkpointing', 'completed', 'failed', 'cancelled', 'preempted']).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent', 'preemptible']).optional(),
  exitCode: z.number().int().optional().nullable(),
  errorMessage: z.string().optional().nullable(),
  tokensCostTotal: z.number().nonnegative().optional(),
  carbonSavedKg: z.number().nonnegative().optional(),
});

export const checkpointCreateSchema = z.object({
  jobId: z.string().min(1),
  stepNumber: z.number().int().nonnegative(),
  epochNumber: z.number().int().nonnegative().default(0),
  lossValue: z.number().optional().nullable(),
  metricsJson: z.string().optional().nullable(),
  storageUri: z.string().min(3),
  fileSizeBytes: z.number().positive().default(1024),
  sha256Hash: z.string().min(16),
  isPreemptionEmergency: z.boolean().default(false),
  institutionId: z.string().default('global'),
});

export const quotaUpdateSchema = z.object({
  departmentId: z.string().min(1),
  departmentName: z.string().min(1),
  allocatedShareWeight: z.number().positive().default(1.0),
  maxConcurrentGpus: z.number().int().positive().default(16),
  halfLifeDecayFactor: z.number().min(0.5).max(0.99).default(0.95),
  institutionId: z.string().default('global'),
});

export const arbitrageEvaluateSchema = z.object({
  gpuModelRequirement: z.string().default('NVIDIA-H100'),
  requestedGpus: z.number().int().positive().default(8),
  estimatedRuntimeHours: z.number().positive().default(4.0),
  onPremiseBusyGpuCount: z.number().int().nonnegative().default(0),
  onPremiseTotalGpuCount: z.number().int().positive().default(64),
});

export const datasetRegisterSchema = z.object({
  datasetId: z.string().min(2),
  name: z.string().min(2),
  version: z.string().default('1.0.0'),
  description: z.string().optional().nullable(),
  files: z.array(
    z.object({
      path: z.string().min(1),
      sizeBytes: z.number().positive(),
      sha256: z.string().min(16),
    })
  ).min(1),
  totalSizeBytes: z.number().positive(),
  manifestSha256: z.string().min(16),
  license: z.string().default('MIT'),
  nsfNihGrantTagged: z.string().optional().nullable(),
  containsPiiPhi: z.boolean().default(false),
  institutionId: z.string().default('global'),
});

export const grantAllocationSchema = z.object({
  accountNumber: z.string().min(2),
  departmentId: z.string().min(1),
  grantNumber: z.string().min(2),
  fundingAgency: z.enum(['NSF', 'NIH', 'DOE', 'DARPA', 'INSTITUTIONAL']).default('NSF'),
  tokens: z.number().positive(),
  effectiveDate: z.string(),
  expiryDate: z.string(),
  auditNotes: z.string().optional().nullable(),
  institutionId: z.string().default('global'),
});
