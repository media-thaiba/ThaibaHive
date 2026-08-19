import 'local_db_adapter.dart';

class OfflineSyncQueue {
  final LocalDbAdapter dbAdapter;
  bool _isInitialized = false;

  OfflineSyncQueue({LocalDbAdapter? adapter}) : dbAdapter = adapter ?? LocalDbAdapter();

  Future<void> initialize() async {
    if (!_isInitialized) {
      await dbAdapter.init();
      _isInitialized = true;
    }
  }

  Future<LocalDbRecord> enqueueMutation({
    required String entityType,
    required String mutationType,
    required Map<String, dynamic> payload,
    int priority = 0,
  }) async {
    await initialize();

    final record = LocalDbRecord(
      id: 'mut_${DateTime.now().millisecondsSinceEpoch}_${payload.hashCode.abs()}',
      entityType: entityType,
      mutationType: mutationType,
      payload: payload,
      clientTimestamp: DateTime.now().toIso8601String(),
      syncStatus: 'PENDING',
      priority: priority,
    );

    await dbAdapter.insert(record);
    return record;
  }

  Future<List<LocalDbRecord>> getPendingRecords() async {
    await initialize();
    return await dbAdapter.getPendingMutations();
  }

  Future<List<LocalDbRecord>> getOutboxBatch({int limit = 50}) async {
    final allPending = await getPendingRecords();
    if (allPending.length <= limit) {
      return allPending;
    }
    return allPending.sublist(0, limit);
  }

  Future<void> markSynced(List<String> ids) async {
    await initialize();
    for (final id in ids) {
      await dbAdapter.updateStatus(id, 'SYNCED');
    }
    await dbAdapter.clearSynced();
  }

  Future<void> markFailed(String id, String errorReason) async {
    await initialize();
    await dbAdapter.updateStatus(id, 'FAILED');
  }

  Future<void> markConflict(String id) async {
    await initialize();
    await dbAdapter.updateStatus(id, 'CONFLICT');
  }
}
