/**
 * Integration / Unit tests for ARES REST API Endpoints (ARES-020)
 */

import { GET as getThreats, POST as postThreats } from '@/app/api/admin/security/predictive-resilience/threats/route';
import { GET as getChaos, POST as postChaos } from '@/app/api/admin/security/predictive-resilience/chaos/experiments/route';
import { POST as postChaosAbort } from '@/app/api/admin/security/predictive-resilience/chaos/abort/route';
import { GET as getResilience } from '@/app/api/admin/security/predictive-resilience/resilience/route';
import { GET as getMetrics } from '@/app/api/admin/security/predictive-resilience/metrics/route';

jest.mock('@/lib/api/auth-guard', () => ({
  requireAuth: (handler: any) => (req: any, ctx: any) => handler(req, ctx),
}));

jest.mock('@/lib/identity/dpop-middleware', () => ({
  withDPoP: (handler: any) => handler,
}));

describe('ARES-020: ARES REST API Endpoints', () => {
  it('GET /threats and POST /threats should return predictive forecasts', async () => {
    const reqPost = new Request('http://localhost/api/admin/security/predictive-resilience/threats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: 'CREDENTIAL_STUFFING',
        evidenceSignals: [
          {
            signalId: 'sig-1',
            source: 'auth_gw',
            signalType: 'FAILED_AUTH_SPIKE',
            weight: 0.9,
            observedValue: 0.9,
          },
        ],
        affectedAssetIds: ['auth-edge-gw'],
      }),
    });

    const resPost = await (postThreats as any)(reqPost);
    expect(resPost.status).toBe(200);
    const dataPost = await resPost.json();
    expect(dataPost.forecast).toBeDefined();
    expect(dataPost.forecast.threatCategory).toBe('CREDENTIAL_STUFFING');

    const resGet = await (getThreats as any)(new Request('http://localhost/api/admin/security/predictive-resilience/threats'));
    expect(resGet.status).toBe(200);
    const dataGet = await resGet.json();
    expect(Array.isArray(dataGet.threats)).toBe(true);
  });

  it('POST /chaos/experiments and POST /chaos/abort should control chaos lifecycle', async () => {
    const reqRun = new Request('http://localhost/api/admin/security/predictive-resilience/chaos/experiments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenarioId: 'chaos-net-partition-edge' }),
    });

    const resRun = await (postChaos as any)(reqRun);
    expect(resRun.status).toBe(200);
    const dataRun = await resRun.json();
    expect(dataRun.execution.state).toBe('COMPLETED');

    const reqAbort = new Request('http://localhost/api/admin/security/predictive-resilience/chaos/abort', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Simulated API abort test' }),
    });

    const resAbort = await (postChaosAbort as any)(reqAbort);
    expect(resAbort.status).toBe(200);
    const dataAbort = await resAbort.json();
    expect(dataAbort.success).toBe(true);
  });

  it('GET /resilience and GET /metrics should return snapshot and telemetry summaries', async () => {
    const resRes = await (getResilience as any)(new Request('http://localhost/api/admin/security/predictive-resilience/resilience'));
    expect(resRes.status).toBe(200);
    const dataRes = await resRes.json();
    expect(dataRes.snapshot.overallScore).toBeDefined();

    const resMet = await (getMetrics as any)(new Request('http://localhost/api/admin/security/predictive-resilience/metrics'));
    expect(resMet.status).toBe(200);
    const dataMet = await resMet.json();
    expect(dataMet.chaosScenariosAvailable).toBeGreaterThan(0);
  });
});
