import 'outbox_queue_manager.dart';
import 'policy_manager.dart';

class BackgroundSyncResult {
  final bool success;
  final int syncedCount;
  final int failedCount;

  BackgroundSyncResult({
    required this.success,
    required this.syncedCount,
    required this.failedCount,
  });
}

class BackgroundSyncWorker {
  static const String taskName = 'com.thaibahive.sync.background_worker';

  static Future<BackgroundSyncResult> executeBackgroundSync() async {
    final pending = OutboxQueueManager.getPendingActions();
    if (pending.isEmpty) {
      return BackgroundSyncResult(success: true, syncedCount: 0, failedCount: 0);
    }

    // Determine dynamic backoff timing from cached policies
    int retryBackoffMs = 5000;
    try {
      final policyMgr = PolicyManager();
      await policyMgr.init();
      final activePolicy = policyMgr.getCachedPolicy();
      if (activePolicy != null) {
        final cellularBackoff = activePolicy['CELLULAR']?['retryBackoffMs'];
        final defaultBackoff = activePolicy['DEFAULT']?['retryBackoffMs'];
        final wifiBackoff = activePolicy['WIFI']?['retryBackoffMs'];
        retryBackoffMs = (cellularBackoff ?? defaultBackoff ?? wifiBackoff ?? 5000) as int;
      }
    } catch (_) {}

    int synced = 0;
    int failed = 0;

    for (final action in List.of(pending)) {
      if (action.retryCount >= 5) {
        failed++;
        continue;
      }

      try {
        // Simulates REST delta sync push API call
        OutboxQueueManager.markSuccess(action.id);
        synced++;
      } catch (e) {
        OutboxQueueManager.incrementRetry(action.id);
        failed++;
        // Respect dynamic retry backoff delay on failure
        await Future.delayed(Duration(milliseconds: retryBackoffMs));
      }
    }

    return BackgroundSyncResult(
      success: failed == 0,
      syncedCount: synced,
      failedCount: failed,
    );
  }
}
