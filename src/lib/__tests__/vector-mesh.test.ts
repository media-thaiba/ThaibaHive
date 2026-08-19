import { VectorClockManager } from '../sync/vector-clock-manager';
import { VectorMeshOptimizer } from '../sync/vector-mesh-optimizer';
import { ConflictResolver, Transaction } from '../sync/conflict-resolver';
import { AdaptiveSyncController } from '../sync/adaptive-sync-controller';

describe('Vector Mesh Optimization Engine', () => {
  describe('VectorClockManager', () => {
    test('happensBefore detects causal ordering', () => {
      const vc = new VectorClockManager();
      const a = { n1: 1, n2: 0 };
      const b = { n1: 1, n2: 1 };
      expect(vc.happensBefore(a, b)).toBe(true);
      expect(vc.happensBefore(b, a)).toBe(false);
    });

    test('concurrent detects unordered events', () => {
      const vc = new VectorClockManager();
      expect(vc.concurrent({ n1: 1, n2: 0 }, { n1: 0, n2: 1 })).toBe(true);
      expect(vc.concurrent({ n1: 1, n2: 1 }, { n1: 0, n2: 1 })).toBe(false);
    });

    test('tick increments node clock', () => {
      const vc = new VectorClockManager();
      vc.tick('node-A');
      vc.tick('node-A');
      const v = vc.getVector();
      expect(v['node-A']).toBe(2);
    });

    test('merge takes element-wise max', () => {
      const vc = new VectorClockManager();
      vc.tick('node-A');
      vc.merge({ 'node-A': 5, 'node-B': 3 });
      const v = vc.getVector();
      expect(v['node-A']).toBe(5);
      expect(v['node-B']).toBe(3);
    });

    test('epoch compaction triggers at 64 nodes without data loss', () => {
      const vc = new VectorClockManager();
      // Add 70 nodes — each with value 10
      for (let i = 0; i < 70; i++) {
        vc.merge({ [`node-${i}`]: 10 });
      }
      // After compaction, epoch should be > 0
      expect(vc.getEpoch()).toBeGreaterThan(0);
      // Causal ordering still works after compaction
      const older = Object.fromEntries(Array.from({ length: 5 }, (_, i) => [`node-${i}`, 5]));
      const newer = Object.fromEntries(Array.from({ length: 5 }, (_, i) => [`node-${i}`, 15]));
      expect(vc.happensBefore(older, newer)).toBe(true);
    });
  });

  describe('VectorMeshOptimizer', () => {
    test('selects eager strategy at low tx rate', () => {
      const opt = new VectorMeshOptimizer();
      expect(opt.selectStrategy(500)).toBe('eager');
    });

    test('selects batched strategy at medium tx rate', () => {
      const opt = new VectorMeshOptimizer();
      expect(opt.selectStrategy(5000)).toBe('batched');
    });

    test('selects priority-batched at high tx rate', () => {
      const opt = new VectorMeshOptimizer();
      expect(opt.selectStrategy(15000)).toBe('priority-batched');
    });

    test('records strategy selection events in metrics', () => {
      const opt = new VectorMeshOptimizer();
      opt.selectStrategy(500);
      opt.selectStrategy(5000);
      const metrics = opt.getMetrics();
      expect(metrics.strategyEvents.length).toBe(2);
    });

    test('prioritizes financial transactions first', () => {
      const opt = new VectorMeshOptimizer();
      const txs = [
        { type: 'metadata', id: '1' },
        { type: 'financial', id: '2' },
        { type: 'academic', id: '3' },
      ];
      const sorted = opt.prioritizeTransactions(txs);
      expect(sorted[0].type).toBe('financial');
    });

    test('computes latency percentiles from recorded merges', () => {
      const opt = new VectorMeshOptimizer();
      for (let i = 1; i <= 100; i++) {
        opt.recordMerge(10, i); // latencies 1..100ms
      }
      const metrics = opt.getMetrics();
      expect(metrics.p50).toBeGreaterThanOrEqual(49);
      expect(metrics.p50).toBeLessThanOrEqual(51);
      expect(metrics.p95).toBeGreaterThanOrEqual(94);
    });
  });

  describe('ConflictResolver', () => {
    test('financial wins over academic regardless of timestamp', () => {
      const cr = new ConflictResolver();
      const financial: Transaction = { id: 'tx1', type: 'financial', timestamp: '2026-01-01T00:00:00Z', data: {} };
      const academic: Transaction = { id: 'tx2', type: 'academic', timestamp: '2026-01-02T00:00:00Z', data: {} };
      const winner = cr.resolve(financial, academic);
      expect(winner.type).toBe('financial');
    });

    test('LWW within same priority tier', () => {
      const cr = new ConflictResolver();
      const older: Transaction = { id: 'tx1', type: 'operational', timestamp: '2026-01-01T00:00:00Z', data: {} };
      const newer: Transaction = { id: 'tx2', type: 'operational', timestamp: '2026-01-02T00:00:00Z', data: {} };
      const winner = cr.resolve(older, newer);
      expect(winner.id).toBe('tx2');
    });

    test('resolveMany handles arrays of transactions', () => {
      const cr = new ConflictResolver();
      const txs: Transaction[] = [
        { id: 'tx1', type: 'metadata', timestamp: '2026-01-01T00:00:00Z', data: {} },
        { id: 'tx2', type: 'financial', timestamp: '2026-01-01T00:00:00Z', data: {} },
        { id: 'tx3', type: 'academic', timestamp: '2026-01-03T00:00:00Z', data: {} },
      ];
      const winner = cr.resolveMany(txs);
      expect(winner?.type).toBe('financial');
    });
  });

  describe('AdaptiveSyncController', () => {
    test('returns synchronous mode when RTT < 50ms', () => {
      const asc = new AdaptiveSyncController();
      expect(asc.determineSyncMode(40)).toBe('synchronous');
    });

    test('returns gossip mode when RTT > 500ms', () => {
      const asc = new AdaptiveSyncController();
      expect(asc.determineSyncMode(600)).toBe('gossip');
    });

    test('returns batched mode for intermediate RTT', () => {
      const asc = new AdaptiveSyncController();
      expect(asc.determineSyncMode(200)).toBe('batched');
    });
  });
});