// Flutter Service & Riverpod State Providers for SUPPLY-HIVE (SUPPLY-020, SUPPLY-021)

import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/supply_models.dart';

class SupplyDockService {
  final List<MobileDockReceiptScan> _localCache = [];
  final List<MobileOfflineSyncQueueItem> _syncQueue = [];
  final List<MobileOfflineSyncQueueItem> _deadLetterQueue = [];

  List<MobileDockReceiptScan> get localCache => List.unmodifiable(_localCache);
  List<MobileOfflineSyncQueueItem> get syncQueue => List.unmodifiable(_syncQueue);
  List<MobileOfflineSyncQueueItem> get deadLetterQueue => List.unmodifiable(_deadLetterQueue);

  Future<List<MobilePurchaseOrderItem>> fetchIncomingDockOrders() async {
    return const [
      MobilePurchaseOrderItem(
        id: 'po-dock-01',
        poNumber: 'PO-2026-081',
        vendorName: 'Apex Scientific & Hardware',
        departmentId: 'dept_hpc',
        totalAmountUsd: 12500.0,
        status: 'issued',
        shippingDock: 'DOCK_A_CENTRAL',
        totalLineItems: 3,
      ),
      MobilePurchaseOrderItem(
        id: 'po-dock-02',
        poNumber: 'PO-2026-092',
        vendorName: 'Global Micro Logistics',
        departmentId: 'dept_facilities',
        totalAmountUsd: 4800.0,
        status: 'partially_shipped',
        shippingDock: 'DOCK_B_WAREHOUSE',
        totalLineItems: 2,
      ),
    ];
  }

  Future<MobileDockReceiptScan> processDockScan({
    required String poId,
    required String barcodeScanned,
    required String itemSku,
    required int quantityReceived,
    required String packageCondition,
    bool isOnline = true,
  }) async {
    final receipt = MobileDockReceiptScan(
      receiptId: 'GRN-MOB-${DateTime.now().millisecondsSinceEpoch}',
      poId: poId,
      barcodeScanned: barcodeScanned,
      itemSku: itemSku,
      quantityReceived: quantityReceived,
      packageCondition: packageCondition,
      timestamp: DateTime.now().toIso8601String(),
      isSynced: isOnline,
    );

    _localCache.add(receipt);

    if (!isOnline) {
      _syncQueue.add(MobileOfflineSyncQueueItem(
        queueId: 'SYNC-${DateTime.now().millisecondsSinceEpoch}',
        action: 'RECEIVE_GOODS',
        payload: receipt.toJson(),
        createdAt: DateTime.now().toIso8601String(),
      ));
    }

    return receipt;
  }

  Future<int> flushSyncQueue({bool simulateNetworkFail = false}) async {
    if (simulateNetworkFail) {
      // Simulate failure incrementing retry count and moving to DLQ if > 3
      final itemsToRetry = List<MobileOfflineSyncQueueItem>.from(_syncQueue);
      _syncQueue.clear();

      for (final item in itemsToRetry) {
        final newRetry = item.retryCount + 1;
        if (newRetry >= 3) {
          _deadLetterQueue.add(MobileOfflineSyncQueueItem(
            queueId: item.queueId,
            action: item.action,
            payload: item.payload,
            retryCount: newRetry,
            lastError: 'HTTP 500 Connection Timeout (Max Retries Exceeded)',
            createdAt: item.createdAt,
          ));
        } else {
          _syncQueue.add(MobileOfflineSyncQueueItem(
            queueId: item.queueId,
            action: item.action,
            payload: item.payload,
            retryCount: newRetry,
            lastError: 'HTTP 500 Connection Timeout',
            createdAt: item.createdAt,
          ));
        }
      }
      return 0;
    }

    final syncedCount = _syncQueue.length;
    _syncQueue.clear();
    return syncedCount;
  }
}

final supplyDockServiceProvider = Provider<SupplyDockService>((ref) {
  return SupplyDockService();
});

final incomingDockOrdersProvider = FutureProvider<List<MobilePurchaseOrderItem>>((ref) async {
  final service = ref.watch(supplyDockServiceProvider);
  return service.fetchIncomingDockOrders();
});
