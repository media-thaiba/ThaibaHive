import 'dart:async';
import '../services/offline_queue.dart';
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

  /// Drain the consolidated [OfflineQueue] (the encrypted Hive store that
  /// feature producers enqueue into) to `POST /mobile/v1/sync`.
  ///
  /// Only server-confirmed events leave the queue; everything else is
  /// re-queued with backoff. Returns the count of confirmed events.
  Future<int> triggerSync() async {
    if (isSyncing) return 0;
    isSyncing = true;
    try {
      final syncedCount = await offlineQueue.flush();
      isSyncing = false;
      return syncedCount;
    } catch (_) {
      isSyncing = false;
      return 0;
    }
  }

  void dispose() {
    _subscription?.cancel();
  }
}
