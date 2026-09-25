import { GET as getArbitrage, POST as postArbitrage } from '../../../app/api/neuro/cloud/arbitrage/route';
import { GET as getProvenance, POST as postProvenance } from '../../../app/api/neuro/provenance/route';
import { GET as getBilling, POST as postBilling } from '../../../app/api/neuro/billing/route';
import { GET as getMetrics } from '../../../app/api/neuro/metrics/route';
import { NeuroDbStore } from '../../db/neuro-store';

describe('NEURO-CLUSTER REST API Endpoints — Arbitrage, Provenance, Billing & Metrics (NEURO-017)', () => {
  beforeEach(() => {
    NeuroDbStore.getInstance().clearMemoryStore();
  });

  it('should query spot quotes and evaluate arbitrage decisions via /api/neuro/cloud/arbitrage', async () => {
    const getQuotesReq = new Request('http://localhost/api/neuro/cloud/arbitrage?gpuModel=NVIDIA-H100');
    const getQuotesRes = await getArbitrage(getQuotesReq as any);
    expect(getQuotesRes.status).toBe(200);
    const quotesData = await getQuotesRes.json();
    expect(quotesData.quotes.length).toBeGreaterThan(0);

    const postEvalReq = new Request('http://localhost/api/neuro/cloud/arbitrage', {
      method: 'POST',
      body: JSON.stringify({
        gpuModelRequirement: 'NVIDIA-H100',
        requestedGpus: 8,
        estimatedRuntimeHours: 4.0,
        onPremiseBusyGpuCount: 60,
        onPremiseTotalGpuCount: 64,
      }),
    });

    const postEvalRes = await postArbitrage(postEvalReq as any);
    expect(postEvalRes.status).toBe(200);
    const evalData = await postEvalRes.json();
    expect(evalData.decision.recommendedTarget).toBeDefined();
  });

  it('should register datasets and export dossiers via /api/neuro/provenance', async () => {
    const postDsReq = new Request('http://localhost/api/neuro/provenance', {
      method: 'POST',
      body: JSON.stringify({
        datasetId: 'DATASET-GENOMICS-01',
        name: 'Genomics 100K Dataset',
        files: [{ path: 'chr1.parquet', sizeBytes: 100000, sha256: 'deadbeef12345678deadbeef12345678deadbeef12345678deadbeef12345678' }],
        totalSizeBytes: 100000,
        manifestSha256: 'manifestdeadbeef12345678deadbeef12345678deadbeef12345678deadbeef',
        institutionId: 'inst_01',
      }),
    });

    const postDsRes = await postProvenance(postDsReq as any);
    expect(postDsRes.status).toBe(201);

    const getDsReq = new Request('http://localhost/api/neuro/provenance?tenantId=inst_01');
    const getDsRes = await getProvenance(getDsReq as any);
    expect(getDsRes.status).toBe(200);
    const dsData = await getDsRes.json();
    expect(dsData.datasets).toHaveLength(1);

    const getDossierReq = new Request('http://localhost/api/neuro/provenance?datasetId=DATASET-GENOMICS-01&export=true&tenantId=inst_01');
    const getDossierRes = await getProvenance(getDossierReq as any);
    expect(getDossierRes.status).toBe(200);
    const dossierData = await getDossierRes.json();
    expect(dossierData.dossier.complianceCertified).toBe(true);
  });

  it('should allocate grants and query billing balances via /api/neuro/billing', async () => {
    const postGrantReq = new Request('http://localhost/api/neuro/billing', {
      method: 'POST',
      body: JSON.stringify({
        accountNumber: 'ACC-NSF-AI-99',
        departmentId: 'dept_cs',
        grantNumber: 'NSF-998877',
        fundingAgency: 'NSF',
        tokens: 10000,
        effectiveDate: '2026-09-01',
        expiryDate: '2027-09-01',
        institutionId: 'inst_01',
      }),
    });

    const postGrantRes = await postBilling(postGrantReq as any);
    expect(postGrantRes.status).toBe(201);

    const getBillingReq = new Request('http://localhost/api/neuro/billing?tenantId=inst_01');
    const getBillingRes = await getBilling(getBillingReq as any);
    expect(getBillingRes.status).toBe(200);
    const billingData = await getBillingRes.json();
    expect(billingData.accounts).toHaveLength(1);
    expect(billingData.accounts[0].tokenBalance).toBe(10000);
  });

  it('should serve Prometheus OpenMetrics text via /api/neuro/metrics', async () => {
    const req = new Request('http://localhost/api/neuro/metrics');
    const res = await getMetrics(req as any);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('# HELP neuro_gpu_utilization_percent');
  });
});
