import { AuctionEngine } from '../agents/negotiation/auction-engine';
import { SwarmCoordinator } from '../agents/swarm/swarm-coordinator';
import { NegotiationCoordinator } from '../agents/negotiation/negotiation-coordinator';

describe('Swarm E2E Workflow', () => {
  test('Complete negotiation + swarm routing workflow under 5s', async () => {
    const start = Date.now();
    const coord = new SwarmCoordinator('regional');

    // 3 local-tier agents bidding on resource r1
    const bids = [
      { agentId: 'local-agent-1', sessionId: 's1', resourceId: 'r1', bidAmount: 100, timestamp: new Date().toISOString() },
      { agentId: 'local-agent-2', sessionId: 's1', resourceId: 'r1', bidAmount: 120, timestamp: new Date().toISOString() },
      { agentId: 'local-agent-3', sessionId: 's1', resourceId: 'r1', bidAmount: 110, timestamp: new Date().toISOString() },
    ];

    // Auction-based negotiation
    const engine = new AuctionEngine();
    const outcome = await engine.processFirstPriceAuction(bids, 50);
    expect(outcome?.winnerId).toBe('local-agent-2');
    expect(outcome?.finalPrice).toBe(120);

    // Coordinator routes allocation decision to local tier
    await coord.routeMessage('local', {
      type: 'allocation_decision',
      sessionId: 's1',
      winnerId: outcome?.winnerId,
      resourceId: 'r1',
    });

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(5000);
  });

  test('Deadlock detection identifies circular wait', async () => {
    const coordinator = new NegotiationCoordinator();
    const graph = new Map([
      ['agent-A', ['agent-B']],
      ['agent-B', ['agent-C']],
      ['agent-C', ['agent-A']],
    ]);
    const isDeadlock = await coordinator.detectDeadlock(graph);
    expect(isDeadlock).toBe(true);
  });

  test('No deadlock in acyclic dependency graph', async () => {
    const coordinator = new NegotiationCoordinator();
    const graph = new Map([
      ['agent-A', ['agent-B']],
      ['agent-B', ['agent-C']],
    ]);
    const isDeadlock = await coordinator.detectDeadlock(graph);
    expect(isDeadlock).toBe(false);
  });
});