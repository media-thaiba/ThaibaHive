// Flutter Unit Tests for SUPPLY-HIVE Mobile (SUPPLY-020, SUPPLY-021)

import 'package:flutter_test/flutter_test.dart';
import 'package:thaibahive_mobile/features/supply/models/supply_models.dart';
import 'package:thaibahive_mobile/features/supply/services/supply_service.dart';

void main() {
  group('SupplyDockService & Offline Sync (SUPPLY-020, SUPPLY-021)', () {
    late SupplyDockService service;

    setUp(() {
      service = SupplyDockService();
    });

    test('should fetch incoming dock purchase orders', () async {
      final orders = await service.fetchIncomingDockOrders();
      expect(orders.length, 2);
      expect(orders.first.poNumber, 'PO-2026-081');
      expect(orders.first.shippingDock, 'DOCK_A_CENTRAL');
    });

    test('should process online dock scan and cache locally', () async {
      final scan = await service.processDockScan(
        poId: 'PO-2026-081',
        barcodeScanned: 'SKU-H100-PCIE-80G',
        itemSku: 'SKU-H100-PCIE-80G',
        quantityReceived: 2,
        packageCondition: 'good',
        isOnline: true,
      );

      expect(scan.isSynced, true);
      expect(scan.quantityReceived, 2);
      expect(service.localCache.length, 1);
      expect(service.syncQueue.isEmpty, true);
    });

    test('should queue offline scans and handle retry/dead-letter queue', () async {
      await service.processDockScan(
        poId: 'PO-2026-092',
        barcodeScanned: 'SKU-VALVE-2IN',
        itemSku: 'SKU-VALVE-2IN',
        quantityReceived: 5,
        packageCondition: 'damaged',
        isOnline: false,
      );

      expect(service.syncQueue.length, 1);

      // Simulate 3 network failures to trigger Dead-Letter Queue (DLQ)
      await service.flushSyncQueue(simulateNetworkFail: true); // retry 1
      expect(service.syncQueue.length, 1);

      await service.flushSyncQueue(simulateNetworkFail: true); // retry 2
      expect(service.syncQueue.length, 1);

      await service.flushSyncQueue(simulateNetworkFail: true); // retry 3 -> moves to DLQ
      expect(service.syncQueue.isEmpty, true);
      expect(service.deadLetterQueue.length, 1);
      expect(service.deadLetterQueue.first.retryCount, 3);
      expect(service.deadLetterQueue.first.lastError, contains('Max Retries Exceeded'));
    });
  });
}
