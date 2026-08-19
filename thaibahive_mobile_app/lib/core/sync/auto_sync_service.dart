import 'dart:async';
import 'network_state_detector.dart';
import 'offline_sync_queue.dart';

class AutoSyncService {
  final NetworkStateDetector networkDetector;
  final OfflineSyncQueue syncQueue;
  StreamSubscription<NetworkStatus>? _subscription;
  bool isSyncing = false;

  AutoSyncService({
    required this.networkDetector,
    required this.syncQueue,
  }) {
    _subscription = networkDetector.onStatusChanged.listen((status) {
      if (status == NetworkStatus.online) {
        triggerSync();
      }
    });
  }

  Future<int> triggerSync() async {
    if (isSyncing) return 0;
    isSyncing = true;
    try {
      final batch = await syncQueue.getOutboxBatch();
      if (batch.isEmpty) {
        isSyncing = false;
        return 0;
      }

      final syncedIds = batch.map((r) => r.id).toList();
      await syncQueue.markSynced(syncedIds);
      isSyncing = false;
      return batch.length;
    } catch (e) {
      isSyncing = false;
      return 0;
    }
  }

  void dispose() {
    _subscription?.cancel();
  }
}
