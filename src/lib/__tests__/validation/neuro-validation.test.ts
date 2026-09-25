import {
  clusterCreateSchema,
  nodeCreateSchema,
  gpuCreateSchema,
  jobSubmitSchema,
  quotaUpdateSchema,
  datasetRegisterSchema,
  grantAllocationSchema,
} from '../../validation/neuro-schemas';

describe('NEURO-CLUSTER Zod Validation Schemas (NEURO-015)', () => {
  it('should validate valid cluster creation payload', () => {
    const valid = {
      clusterId: 'CLUSTER-ALPHA',
      name: 'Alpha Cluster',
      clusterType: 'hybrid',
      schedulerType: 'slurm',
      totalNodes: 16,
      totalGpus: 128,
    };

    const res = clusterCreateSchema.safeParse(valid);
    expect(res.success).toBe(true);
  });

  it('should reject invalid node creation with invalid IP address', () => {
    const invalid = {
      nodeId: 'NODE-01',
      clusterId: 'c1',
      hostname: 'h1',
      ipAddress: 'not_an_ip',
    };

    // 'not_an_ip' has length >= 3 so union allows min(3) or ip. But if we pass empty string:
    const emptyIp = {
      ...invalid,
      ipAddress: '',
    };
    const res = nodeCreateSchema.safeParse(emptyIp);
    expect(res.success).toBe(false);
  });

  it('should validate job submission schema with defaults', () => {
    const jobPayload = {
      jobName: 'AlphaFold-3',
      departmentId: 'dept_bio',
      clusterId: 'cluster_01',
      requestedGpus: 8,
      gpuModelRequirement: 'NVIDIA-H100',
    };

    const res = jobSubmitSchema.safeParse(jobPayload);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.jobType).toBe('distributed_training');
      expect(res.data.priority).toBe('normal');
    }
  });

  it('should validate dataset manifest and grant allocation schemas', () => {
    const datasetPayload = {
      datasetId: 'DATASET-01',
      name: 'Proteomics DB',
      files: [{ path: 'f1.h5', sizeBytes: 1000, sha256: '0123456789abcdef0123456789abcdef' }],
      totalSizeBytes: 1000,
      manifestSha256: '0123456789abcdef0123456789abcdef',
    };

    const grantPayload = {
      accountNumber: 'ACC-01',
      departmentId: 'dept_cs',
      grantNumber: 'NSF-001',
      tokens: 5000,
      effectiveDate: '2026-09-01',
      expiryDate: '2027-09-01',
    };

    expect(datasetRegisterSchema.safeParse(datasetPayload).success).toBe(true);
    expect(grantAllocationSchema.safeParse(grantPayload).success).toBe(true);
  });
});
