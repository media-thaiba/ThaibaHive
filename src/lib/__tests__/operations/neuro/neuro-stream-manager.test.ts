import { NeuroStreamManager } from '../../../operations/neuro/streaming/neuro-stream-manager';

describe('NeuroStreamManager (NEURO-012)', () => {
  let streamManager: NeuroStreamManager;

  beforeEach(() => {
    streamManager = NeuroStreamManager.getInstance();
    streamManager.clear();
  });

  it('should subscribe and receive tenant-isolated telemetry stream events', () => {
    const receivedEvents: any[] = [];
    const unsubscribe = streamManager.subscribe('cluster:telemetry', 'inst_01', (event) => {
      receivedEvents.push(event);
    });

    streamManager.broadcast({
      topic: 'cluster:telemetry',
      event: 'gpu_stat',
      data: { gpuId: 'GPU-01', utilizationPercent: 88.5 },
      timestamp: new Date().toISOString(),
      institutionId: 'inst_01',
    });

    // Cross-tenant event should NOT be received
    streamManager.broadcast({
      topic: 'cluster:telemetry',
      event: 'gpu_stat',
      data: { gpuId: 'GPU-99', utilizationPercent: 12.0 },
      timestamp: new Date().toISOString(),
      institutionId: 'inst_02',
    });

    expect(receivedEvents.length).toBe(1);
    expect(receivedEvents[0].data.gpuId).toBe('GPU-01');

    unsubscribe();
  });

  it('should buffer and broadcast job log lines', () => {
    streamManager.appendJobLog('JOB-LLM-01', 'Epoch 1/10: Loss = 2.45', 'inst_01');
    streamManager.appendJobLog('JOB-LLM-01', 'Epoch 2/10: Loss = 1.98', 'inst_01');

    const logs = streamManager.getBufferedLogs('JOB-LLM-01');
    expect(logs.length).toBe(2);
    expect(logs[1]).toContain('Epoch 2/10');
  });
});
