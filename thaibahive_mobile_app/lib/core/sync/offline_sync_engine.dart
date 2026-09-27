import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/app_config.dart';
import '../../features/auth/services/token_storage_service.dart';
import 'outbox_queue_manager.dart';

/// Drain-only engine for the in-memory [OutboxQueueManager] store.
///
/// @Deprecated: this engine drains a store that no feature producer writes
/// to. The consolidated offline path is `OfflineQueue.flush()` in
/// `core/services/offline_queue.dart` (encrypted Hive store, drained by
/// `AutoSyncService` on reconnect). Kept for backward compatibility only.
@Deprecated(
  'Use offlineQueue.flush() from core/services/offline_queue.dart instead. '
  'This engine reads OutboxQueueManager, which has no producers.',
)
class OfflineSyncEngine {
  final OutboxQueueManager _outboxManager;
  final TokenStorageService _tokenStorage;
  bool _isSyncing = false;

  OfflineSyncEngine({
    OutboxQueueManager? outboxManager,
    TokenStorageService? tokenStorage,
  })  : _outboxManager = outboxManager ?? OutboxQueueManager(),
        _tokenStorage = tokenStorage ?? TokenStorageService();

  bool get isSyncing => _isSyncing;

  Future<bool> flushQueue() async {
    if (_isSyncing) return false;
    _isSyncing = true;

    try {
      final pending = OutboxQueueManager.getPendingActions();
      if (pending.isEmpty) {
        _isSyncing = false;
        return true;
      }

      final token = await _tokenStorage.getToken();
      final body = {
        'lastSyncedAt': DateTime.now().toIso8601String(),
        'mutations': pending.map((e) => e.toJson()).toList(),
      };

      final response = await http.post(
        Uri.parse('${AppConfig.apiBaseUrl}/mobile/v1/sync'),
        headers: {
          'Authorization': 'Bearer ${token ?? ''}',
          'Content-Type': 'application/json',
        },
        body: jsonEncode(body),
      );

      if (response.statusCode == 200) {
        final resData = jsonDecode(response.body);
        final processed = (resData['processedMutations'] as List?)?.cast<String>() ?? [];
        if (processed.isNotEmpty) {
          for (final id in processed) {
            OutboxQueueManager.markSuccess(id);
          }
        }
        _isSyncing = false;
        return true;
      }
      _isSyncing = false;
      return false;
    } catch (e) {
      _isSyncing = false;
      return false;
    }
  }
}
