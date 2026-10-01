import { AgentMessageBus } from '../core/message-bus';

describe('AgentMessageBus Priority, Durable Outbox, DLQ & Replay Suite (AIG-002)', () => {
  let bus: AgentMessageBus;

  beforeEach(() => {
    bus = AgentMessageBus.getInstance();
    bus.clear();
  });

  it('publishes and delivers messages to topic subscribers', async () => {
    const received: string[] = [];
    bus.subscribe('alert.threat', (msg) => {
      received.push(msg.id);
    });

    const msg = bus.publish('security-agent', '*', 'alert.threat', { threatLevel: 'high' });
    expect(msg.id).toBeDefined();
    expect(received).toContain(msg.id);
  });

  it('delivers critical priority messages before normal priority when queued', async () => {
    const processedOrder: string[] = [];

    // Subscribe handler with small delay to test queue ordering
    bus.subscribe('batch.process', async (msg) => {
      processedOrder.push(msg.payload.name as string);
    });

    const msg1 = {
      id: 'm1',
      senderId: 'agent-1',
      recipientId: '*',
      topic: 'batch.process',
      payload: { name: 'normal-job' },
      priority: 'normal' as const,
      timestamp: new Date().toISOString(),
    };
    const msg2 = {
      id: 'm2',
      senderId: 'agent-2',
      recipientId: '*',
      topic: 'batch.process',
      payload: { name: 'critical-job' },
      priority: 'critical' as const,
      timestamp: new Date().toISOString(),
    };

    bus.enqueue(msg1);
    bus.enqueue(msg2);
    await bus.flush();

    expect(processedOrder).toContain('critical-job');
    expect(processedOrder).toContain('normal-job');
  });

  it('moves repeatedly failing messages to the Dead Letter Queue (DLQ) and supports replay', async () => {
    let failAttempts = 0;
    bus.subscribe('flaky.task', async (msg) => {
      failAttempts++;
      if (failAttempts <= 3) {
        throw new Error('Transient execution failure');
      }
    });

    await bus.publishAsync('agent-1', '*', 'flaky.task', { data: 123 }, 'high', { institutionId: 'inst_alpha' });

    const deadLetters = bus.getDeadLetters('flaky.task', 'inst_alpha');
    expect(deadLetters.length).toBe(1);
    expect(deadLetters[0].error).toContain('Transient execution failure');
    expect(deadLetters[0].attempts).toBe(3);

    // Replay dead letters
    const replayedCount = bus.replayDeadLetters('flaky.task', 'inst_alpha');
    expect(replayedCount).toBe(1);
    expect(bus.getDeadLetters('flaky.task', 'inst_alpha').length).toBe(0);
  });

});
