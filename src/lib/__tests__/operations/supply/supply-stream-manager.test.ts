import { SupplyStreamManager, SupplyStreamEvent } from '../../../operations/supply/streaming/supply-stream-manager';

describe('SupplyStreamManager (SUPPLY-011)', () => {
  let streamManager: SupplyStreamManager;

  beforeEach(() => {
    streamManager = SupplyStreamManager.getInstance();
  });

  it('should broadcast order status events to tenant-isolated subscribers', (done) => {
    const unsubscribe = streamManager.subscribe('orders:status', 'inst-test-stream', (event: SupplyStreamEvent) => {
      expect(event.topic).toBe('orders:status');
      expect(event.event).toBe('po_issued');
      expect(event.data.poNumber).toBe('PO-TEST-100');
      unsubscribe();
      done();
    });

    streamManager.broadcast({
      topic: 'orders:status',
      event: 'po_issued',
      data: { poNumber: 'PO-TEST-100', totalAmountUsd: 5400.0 },
      timestamp: new Date().toISOString(),
      institutionId: 'inst-test-stream',
    });
  });

  it('should store recent events in buffer history', () => {
    streamManager.broadcast({
      topic: 'receiving:dock',
      event: 'goods_inspected',
      data: { receiptNumber: 'GRN-990', status: 'verified' },
      timestamp: new Date().toISOString(),
      institutionId: 'inst-test-stream',
    });

    const recent = streamManager.getRecentEvents('receiving:dock', 'inst-test-stream');
    expect(recent.length).toBeGreaterThan(0);
    expect(recent[0].event).toBe('goods_inspected');
  });
});
