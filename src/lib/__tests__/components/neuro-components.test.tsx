import React from 'react';
import { render, screen } from '@testing-library/react';
import { ClusterOverviewCard } from '../../../components/operations/neuro/cluster-overview-card';
import { NodeTopologyGrid } from '../../../components/operations/neuro/node-topology-grid';
import { SpotArbitragePanel } from '../../../components/operations/neuro/spot-arbitrage-panel';
import { GrantLedgerTable } from '../../../components/operations/neuro/grant-ledger-table';
import { NeuroClusterItem, NeuroGpuItem, NeuroNodeItem } from '../../operations/neuro/neuro-types';

describe('NEURO-CLUSTER UI Components Unit Tests (NEURO-021)', () => {
  const mockCluster: NeuroClusterItem = {
    id: 'c1',
    clusterId: 'CLUSTER-TITAN-01',
    name: 'Titan Supercluster',
    clusterType: 'hybrid',
    schedulerType: 'slurm',
    region: 'local-dc-1',
    totalNodes: 16,
    totalGpus: 128,
    activeJobsCount: 8,
    status: 'active',
    networkTopology: 'infiniband_fat_tree',
    institutionId: 'inst_01',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockNode: NeuroNodeItem = {
    id: 'n1',
    nodeId: 'NODE-DGX-01',
    clusterId: 'c1',
    hostname: 'dgx-01.campus.edu',
    ipAddress: '10.0.0.10',
    nodeType: 'compute',
    cpuCores: 64,
    ramBytes: 549755813888,
    gpuCount: 8,
    gpuModel: 'NVIDIA-H100-SXM5-80GB',
    status: 'ready',
    isCloudBurst: false,
    cloudProvider: 'on_prem',
    currentPowerWatts: 650,
    temperatureCelsius: 38,
    institutionId: 'inst_01',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockGpu: NeuroGpuItem = {
    id: 'g1',
    gpuId: 'GPU-01-0',
    nodeId: 'n1',
    gpuIndex: 0,
    model: 'NVIDIA-H100-SXM5-80GB',
    vramTotalBytes: 85899345920,
    vramAllocatedBytes: 0,
    utilizationPercent: 0,
    temperatureCelsius: 36,
    powerDrawWatts: 150,
    smClockMhz: 1980,
    memoryClockMhz: 1593,
    pcieBandwidthGbps: 64,
    nvlinkActive: true,
    numaNode: 0,
    status: 'idle',
    institutionId: 'inst_01',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('should render ClusterOverviewCard correctly', () => {
    render(<ClusterOverviewCard cluster={mockCluster} allocatedGpus={64} activeJobs={8} />);
    expect(screen.getByText('Titan Supercluster')).toBeInTheDocument();
    expect(screen.getByText(/local-dc-1/)).toBeInTheDocument();
    expect(screen.getByText('50.0%')).toBeInTheDocument(); // 64/128
  });

  it('should render NodeTopologyGrid and NVLink badge', () => {
    render(<NodeTopologyGrid nodes={[mockNode]} gpusByNode={{ n1: [mockGpu] }} />);
    expect(screen.getByText('dgx-01.campus.edu')).toBeInTheDocument();
    expect(screen.getByText('GPU 0')).toBeInTheDocument();
    expect(screen.getByText('NVLink')).toBeInTheDocument();
  });

  it('should render SpotArbitragePanel with live quotes', () => {
    const quotes = [
      {
        provider: 'aws' as const,
        region: 'us-east-1',
        gpuModel: 'NVIDIA-H100',
        instanceType: 'p5.48xlarge',
        gpuCount: 8,
        spotPriceUsdPerHour: 24.50,
        onDemandPriceUsdPerHour: 98.32,
        savingsPercent: 75.1,
        interruptionRiskScore: 0.22,
        lastUpdated: new Date().toISOString(),
      },
    ];

    render(<SpotArbitragePanel quotes={quotes} />);
    expect(screen.getByText('Real-Time Cloud Spot Arbitrage Matrix')).toBeInTheDocument();
    expect(screen.getByText('AWS')).toBeInTheDocument();
    expect(screen.getByText('$24.50/hr')).toBeInTheDocument();
    expect(screen.getByText('-75%')).toBeInTheDocument();
  });

  it('should render GrantLedgerTable with accounts and double-entry debits', () => {
    const accounts = [
      {
        id: 'acc1',
        accountNumber: 'ACC-NSF-AI-01',
        departmentId: 'dept_cs',
        grantId: 'NSF-2026',
        tokenBalance: 4500,
        tokenAllocatedTotal: 5000,
        tokenSpentTotal: 500,
        softCapPercent: 80,
        hardCapTokens: 5000,
        isHardCapLocked: false,
        status: 'active' as const,
        institutionId: 'inst_01',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const transactions = [
      {
        id: 'tx1',
        transactionId: 'TX-COMPUTE-001',
        accountId: 'acc1',
        transactionType: 'compute_debit' as const,
        tokensAmount: 120,
        gpuSeconds: 54000,
        debitAccountCode: 'EXPENSE:GRANT_COMPUTE',
        creditAccountCode: 'REVENUE:HPC_CLUSTER_OPS',
        balanceAfterTokens: 4880,
        description: 'AlphaFold 3 Run',
        merkleLeafHash: 'hash123',
        institutionId: 'inst_01',
        createdAt: new Date().toISOString(),
      },
    ];

    render(<GrantLedgerTable accounts={accounts} transactions={transactions} />);
    expect(screen.getByText('ACC-NSF-AI-01')).toBeInTheDocument();
    expect(screen.getByText('4500.0')).toBeInTheDocument();
    expect(screen.getByText('TX-COMPUTE-001')).toBeInTheDocument();
    expect(screen.getByText('-120.0')).toBeInTheDocument();
  });
});
