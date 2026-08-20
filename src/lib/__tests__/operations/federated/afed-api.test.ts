import { GET as getModels, POST as registerModel } from '@/app/api/operations/federated/models/route';
import { POST as aggregateRound } from '@/app/api/operations/federated/rounds/aggregate/route';
import { GET as getNodes, POST as registerNode } from '@/app/api/operations/federated/nodes/route';
import { GET as getBudget } from '@/app/api/operations/federated/privacy/budget/route';
import { POST as resetBudget } from '@/app/api/operations/federated/privacy/budget/reset/route';
import { POST as predictInference } from '@/app/api/operations/federated/inference/predict/route';
import { GET as getBenchmarks } from '@/app/api/operations/federated/benchmarks/route';

describe('A-FED REST API Endpoints Integration Test Suite', () => {
  it('should register and retrieve federated models via API', async () => {
    const reqPost = new Request('http://localhost/api/operations/federated/models', {
      method: 'POST',
      body: JSON.stringify({
        modelId: 'm_api_test',
        name: 'API Test Model',
        domain: 'retention',
        version: '1.0.0',
        architecture: 'logistic_regression',
        inputDimensions: 3,
        outputDimensions: 1,
      }),
    });

    const resPost = await registerModel(reqPost);
    expect(resPost.status).toBe(201);

    const reqGet = new Request('http://localhost/api/operations/federated/models');
    const resGet = await getModels(reqGet);
    expect(resGet.status).toBe(200);
    const data = await resGet.json();
    expect(data.models.some((m: any) => m.modelId === 'm_api_test')).toBe(true);
  });

  it('should aggregate round gradients via API', async () => {
    const req = new Request('http://localhost/api/operations/federated/rounds/aggregate', {
      method: 'POST',
      body: JSON.stringify({
        modelId: 'm_api_test',
        roundNumber: 1,
        algorithm: 'FedAvg',
        clientUpdates: [
          { nodeId: 'node_1', weights: [1.0, 2.0, 3.0], sampleCount: 100, localLoss: 0.2, localAccuracy: 0.9 },
          { nodeId: 'node_2', weights: [3.0, 4.0, 5.0], sampleCount: 100, localLoss: 0.1, localAccuracy: 0.95 },
        ],
      }),
    });

    const res = await aggregateRound(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.aggregatedWeights).toEqual([2.0, 3.0, 4.0]);
    expect(data.globalAccuracy).toBe(0.925);
  });

  it('should register and retrieve nodes via API', async () => {
    const reqPost = new Request('http://localhost/api/operations/federated/nodes', {
      method: 'POST',
      body: JSON.stringify({
        nodeId: 'node_edge_1',
        campusId: 'campus_1',
        campusName: 'Main Campus',
        status: 'idle',
        computeTier: 'campus_server',
        sampleCount: 500,
      }),
    });

    const resPost = await registerNode(reqPost);
    expect(resPost.status).toBe(200);

    const resGet = await getNodes(new Request('http://localhost/api/operations/federated/nodes'));
    const data = await resGet.json();
    expect(data.nodes.some((n: any) => n.nodeId === 'node_edge_1')).toBe(true);
  });

  it('should manage privacy budgets via API', async () => {
    const resGet = await getBudget(new Request('http://localhost/api/operations/federated/privacy/budget?tenantId=tenant_x'));
    expect(resGet.status).toBe(200);

    const resReset = await resetBudget(
      new Request('http://localhost/api/operations/federated/privacy/budget/reset', {
        method: 'POST',
        body: JSON.stringify({
          tenantId: 'tenant_x',
          newBudgetEpsilon: 15.0,
          reason: 'Authorized semi-annual budget allocation',
        }),
      })
    );
    expect(resReset.status).toBe(200);
    const data = await resReset.json();
    expect(data.budget.totalBudgetEpsilon).toBe(15.0);
  });

  it('should execute edge inference and return cross-campus benchmarks', async () => {
    const predReq = new Request('http://localhost/api/operations/federated/inference/predict', {
      method: 'POST',
      body: JSON.stringify({
        modelId: 'm_retention',
        inputVector: [0.8, 0.9, 0.7, 0.1, 0.95],
      }),
    });

    const predRes = await predictInference(predReq);
    expect(predRes.status).toBe(200);
    const predData = await predRes.json();
    expect(predData.result.predictedClass).toBeDefined();

    const benchRes = await getBenchmarks(new Request('http://localhost/api/operations/federated/benchmarks'));
    expect(benchRes.status).toBe(200);
    const benchData = await benchRes.json();
    expect(benchData.benchmarks.length).toBeGreaterThan(0);
  });
});
