import { AuctionEngine } from '../agents/negotiation/auction-engine';
import { UtilityEngine } from '../agents/negotiation/utility-engine';
import { ConstraintEngine } from '../agents/negotiation/constraint-engine';
import { NegotiationCoordinator } from '../agents/negotiation/negotiation-coordinator';

describe('Negotiation Framework', () => {
  test('First Price Auction', async () => {
    const engine = new AuctionEngine();
    const result = await engine.processFirstPriceAuction([
      { agentId: 'a1', sessionId: 's1', resourceId: 'r1', bidAmount: 100, timestamp: '' },
      { agentId: 'a2', sessionId: 's1', resourceId: 'r1', bidAmount: 120, timestamp: '' }
    ], 50);
    expect(result?.winnerId).toBe('a2');
    expect(result?.finalPrice).toBe(120);
  });
  
  test('Vickrey Auction', async () => {
    const engine = new AuctionEngine();
    const result = await engine.processVickreyAuction([
      { agentId: 'a1', sessionId: 's1', resourceId: 'r1', bidAmount: 100, timestamp: '' },
      { agentId: 'a2', sessionId: 's1', resourceId: 'r1', bidAmount: 120, timestamp: '' }
    ], 50);
    expect(result?.winnerId).toBe('a2');
    expect(result?.finalPrice).toBe(100);
  });
  
  test('Utility Engine', () => {
    const engine = new UtilityEngine();
    const options = [{ id: 1, val: 10 }, { id: 2, val: 20 }];
    const res = engine.calculateParetoOptimal(options, { val: 1 });
    expect(res[0].id).toBe(2);
  });
  
  test('Constraint Engine', () => {
    const engine = new ConstraintEngine();
    const res = engine.evaluate({ budget: 100 }, { cost: 150, usage: 0 });
    expect(res.status).toBe('infeasible');
  });
  
  test('Deadlock Detection', async () => {
    const coord = new NegotiationCoordinator();
    const graph = new Map([['A', ['B']], ['B', ['A']]]);
    const isDeadlock = await coord.detectDeadlock(graph);
    expect(isDeadlock).toBe(true);
  });
});