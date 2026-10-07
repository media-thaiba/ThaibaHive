import 'dart:convert';
import 'dart:typed_data';
import 'dart:math';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:crypto/crypto.dart';
import '../network/api_client.dart';
import 'offline_cache_service.dart';

/// Sync action → entity/mutationType map (mirrors server SYNC_ACTION_ENTITY_MAP).
/// Must stay in sync with server for payload v2 compliance.
const _syncActionEntityMap = {
  'leave_apply': {'entityType': 'leave', 'mutationType': 'CREATE'},
  'leave_cancel': {'entityType': 'leave', 'mutationType': 'UPDATE'},
  'task_create': {'entityType': 'task', 'mutationType': 'CREATE'},
  'task_update': {'entityType': 'task', 'mutationType': 'UPDATE'},
  'task_delete': {'entityType': 'task', 'mutationType': 'DELETE'},
  'expense_create': {'entityType': 'expense', 'mutationType': 'CREATE'},
  'attendance_nfc_checkin': {'entityType': 'attendance', 'mutationType': 'CREATE'},
  'attendance_punch': {'entityType': 'attendance', 'mutationType': 'UPDATE'},
  'attendance_checkout': {'entityType': 'attendance', 'mutationType': 'UPDATE'},
  'approval_approve': {'entityType': 'approval', 'mutationType': 'UPDATE'},
  'approval_reject': {'entityType': 'approval', 'mutationType': 'UPDATE'},
  'finance_purchase_action': {'entityType': 'purchase', 'mutationType': 'UPDATE'},
  'finance_reconciliation_match': {'entityType': 'reconciliation_item', 'mutationType': 'UPDATE'},
};

/// Offline queue item status
enum QueueStatus {
  pending,
  syncing,
  completed,
  failed,
  conflict,
}

/// Represents an offline event to be synced with the server
class OfflineEvent {
  final String clientEventId;
  final String type;
  final Map<String, dynamic> payload;
  final QueueStatus status;
  final DateTime createdAt;
  final DateTime? syncedAt;
  final int retryCount;
  final String? errorMessage;
  final Map<String, dynamic>? conflictDetails;
  final DateTime? completedAt;

  OfflineEvent({
    required this.clientEventId,
    required this.type,
    required this.payload,
    this.status = QueueStatus.pending,
    required this.createdAt,
    this.syncedAt,
    this.retryCount = 0,
    this.errorMessage,
    this.conflictDetails,
    this.completedAt,
  });

  Map<String, dynamic> toJson() => {
    'clientEventId': clientEventId,
    'type': type,
    'payload': payload,
    'status': status.name,
    'createdAt': createdAt.toIso8601String(),
    'syncedAt': syncedAt?.toIso8601String(),
    'retryCount': retryCount,
    'errorMessage': errorMessage,
    'conflictDetails': conflictDetails,
    'completedAt': completedAt?.toIso8601String(),
  };

  factory OfflineEvent.fromJson(Map<String, dynamic> json) => OfflineEvent(
    clientEventId: json['clientEventId'] as String,
    type: json['type'] as String,
    payload: Map<String, dynamic>.from(json['payload'] as Map),
    status: QueueStatus.values.firstWhere(
      (e) => e.name == json['status'],
      orElse: () => QueueStatus.pending,
    ),
    createdAt: DateTime.parse(json['createdAt'] as String),
    syncedAt: json['syncedAt'] != null ? DateTime.parse(json['syncedAt'] as String) : null,
    retryCount: json['retryCount'] as int? ?? 0,
    errorMessage: json['errorMessage'] as String?,
    conflictDetails: json['conflictDetails'] != null
        ? Map<String, dynamic>.from(json['conflictDetails'] as Map)
        : null,
    completedAt: json['completedAt'] != null
        ? DateTime.parse(json['completedAt'] as String)
        : null,
  );
}

/// Secure offline queue using encrypted Hive storage
/// 
/// Features:
/// - AES-256 encryption at rest via Hive cipher
/// - Unique clientEventId for deduplication
/// - Syncing state to prevent data loss on crash
/// - Automatic retry with exponential backoff
class OfflineQueue {
  static const String _boxName = 'offline_queue';
  static const String _keyBoxName = 'offline_queue_key';
  static const int _maxRetries = 3;
  
  late Box<OfflineEvent> _box;
  late FlutterSecureStorage _secureStorage;
  bool _initialized = false;

  /// Initialize the offline queue with encryption
  Future<void> init() async {
    if (_initialized) return;
    
    await Hive.initFlutter();
    
    _secureStorage = const FlutterSecureStorage(
      aOptions: AndroidOptions(encryptedSharedPreferences: true),
    );
    
    // Register adapter
    Hive.registerAdapter(_OfflineEventAdapter());
    
    // Get or generate encryption key
    final encryptionKey = await _getEncryptionKey();
    
    // Open encrypted box
    _box = await Hive.openBox<OfflineEvent>(
      _boxName,
      encryptionCipher: HiveAesCipher(encryptionKey),
    );
    
    _initialized = true;
  }

  /// Get or generate a secure encryption key
  Future<Uint8List> _getEncryptionKey() async {
    String? keyString = await _secureStorage.read(key: _keyBoxName);
    
    if (keyString == null) {
      // Generate new 256-bit key using cryptographically secure random numbers
      final random = Random.secure();
      final keyBytes = List<int>.generate(32, (i) => random.nextInt(256));
      keyString = base64Url.encode(keyBytes);
      await _secureStorage.write(key: _keyBoxName, value: keyString);
    }
    
    return base64Url.decode(keyString);
  }

  /// Add an event to the offline queue
  Future<OfflineEvent> enqueue({
    required String type,
    required Map<String, dynamic> payload,
  }) async {
    if (!_initialized) await init();
    
    final event = OfflineEvent(
      clientEventId: _generateClientId(),
      type: type,
      payload: payload,
      createdAt: DateTime.now(),
    );
    
    await _box.put(event.clientEventId, event);
    return event;
  }

  /// Mark an event as syncing (prevents deletion before server confirmation)
  Future<void> markSyncing(String clientEventId) async {
    final event = _box.get(clientEventId);
    if (event == null) return;
    
    final updated = OfflineEvent(
      clientEventId: event.clientEventId,
      type: event.type,
      payload: event.payload,
      status: QueueStatus.syncing,
      createdAt: event.createdAt,
      retryCount: event.retryCount,
    );
    
    await _box.put(clientEventId, updated);
  }

  /// Mark an event as completed (safe to delete)
  Future<void> markCompleted(String clientEventId) async {
    // Keep as completed receipt for 14 days (for idempotency checks)
    // The SyncCoordinator will handle cleanup
    final event = _box.get(clientEventId);
    if (event == null) return;
    
    final updated = OfflineEvent(
      clientEventId: event.clientEventId,
      type: event.type,
      payload: event.payload,
      status: QueueStatus.completed,
      createdAt: event.createdAt,
      syncedAt: DateTime.now(),
      retryCount: event.retryCount,
      errorMessage: event.errorMessage,
      conflictDetails: event.conflictDetails,
      completedAt: DateTime.now(),
    );
    await _box.put(clientEventId, updated);
  }

  /// Mark an event as failed (will retry if under max retries, or trigger cache rollback on terminal failure)
  Future<void> markFailed(String clientEventId, String error, {bool isTerminal = false}) async {
    final event = _box.get(clientEventId);
    if (event == null) return;
    
    if (isTerminal || event.retryCount >= _maxRetries) {
      // Move to failed state for manual review & roll back optimistic cache
      final updated = OfflineEvent(
        clientEventId: event.clientEventId,
        type: event.type,
        payload: event.payload,
        status: QueueStatus.failed,
        createdAt: event.createdAt,
        syncedAt: DateTime.now(),
        retryCount: event.retryCount + 1,
        errorMessage: error,
        completedAt: DateTime.now(),
      );
      await _box.put(clientEventId, updated);
      await offlineCacheService.rollbackOptimisticWrite(clientEventId);
    } else {
      // Reset to pending for retry
      final updated = OfflineEvent(
        clientEventId: event.clientEventId,
        type: event.type,
        payload: event.payload,
        status: QueueStatus.pending,
        createdAt: event.createdAt,
        retryCount: event.retryCount + 1,
        errorMessage: error,
      );
      await _box.put(clientEventId, updated);
    }
  }

  /// Mark an event as a conflict (server-side conflict detected)
  Future<void> markConflict(String clientEventId, Map<String, dynamic> conflictDetails) async {
    final event = _box.get(clientEventId);
    if (event == null) return;
    
    final updated = OfflineEvent(
      clientEventId: event.clientEventId,
      type: event.type,
      payload: event.payload,
      status: QueueStatus.conflict,
      createdAt: event.createdAt,
      syncedAt: DateTime.now(),
      retryCount: event.retryCount,
      errorMessage: 'Server-side conflict detected',
      conflictDetails: conflictDetails,
    );
    await _box.put(clientEventId, updated);
  }

  /// Reset a failed or conflict event back to pending for retry
  Future<void> resetToPending(String clientEventId) async {
    if (!_initialized) return;
    final event = _box.get(clientEventId);
    if (event == null) return;
    if (event.status != QueueStatus.failed && event.status != QueueStatus.conflict) return;
    
    final updated = OfflineEvent(
      clientEventId: event.clientEventId,
      type: event.type,
      payload: event.payload,
      status: QueueStatus.pending,
      createdAt: event.createdAt,
      retryCount: 0, // Reset retry count on manual revive
      errorMessage: null,
      conflictDetails: null,
    );
    await _box.put(clientEventId, updated);
  }

  /// Get all pending events for sync
  List<OfflineEvent> getPendingEvents() {
    if (!_initialized) return [];

    return _box.values
        .where((e) => e.status == QueueStatus.pending)
        .toList()
      ..sort((a, b) => a.createdAt.compareTo(b.createdAt));
  }

  /// Drain pending events to the server (`POST /mobile/v1/sync`).
  ///
  /// Only server-confirmed event IDs are removed from the queue. Events the
  /// server does not confirm are re-queued through [markFailed] (retry with
  /// exponential backoff, terminal rollback after max retries). Transport
  /// failures leave every event queued for the next drain.
  ///
  /// The optional [httpClient] override exists for tests; production callers
  /// use the authenticated shared client.
  ///
  /// Returns the number of server-confirmed events.
  Future<int> flush({Dio? httpClient, String? deviceId}) async {
    if (!_initialized) await init();

    final pending = getPendingEvents();
    if (pending.isEmpty) return 0;

    for (final event in pending) {
      await markSyncing(event.clientEventId);
    }

    try {
      final dio = httpClient ?? ApiClient().dio;
      final response = await dio.post(
        '/mobile/v1/sync',
        data: {
          'deviceId': deviceId ?? 'unknown',
          'lastSyncedAt': DateTime.now().toIso8601String(),
          'mutations': pending
              .map((event) => {
                    'id': event.clientEventId,
                    'action': event.type,
                    'timestamp': event.createdAt.toIso8601String(),
                    'payload': event.payload,
                    'mutationType': _syncActionEntityMap[event.type]?['mutationType'],
                    'entityType': _syncActionEntityMap[event.type]?['entityType'],
                  })
              .toList(),
        },
      );

      final body = response.data;
      final List<dynamic> processed = body is Map
          ? (body['processedMutations'] as List? ?? const [])
          : const [];
      final conflictList = body is Map
          ? (body['conflicts'] as List? ?? const [])
          : const [];
      final confirmedIds =
          processed.map((id) => id.toString()).toSet();

      var confirmed = 0;
      for (final event in pending) {
        if (conflictList.any((c) => c is Map && c['clientEventId'] == event.clientEventId)) {
          final conflict = conflictList.firstWhere((c) => c is Map && c['clientEventId'] == event.clientEventId);
          await markConflict(event.clientEventId, Map<String, dynamic>.from(conflict as Map));
        } else if (confirmedIds.contains(event.clientEventId)) {
          await markCompleted(event.clientEventId);
          confirmed++;
        } else {
          await markFailed(
            event.clientEventId,
            'Server did not confirm mutation',
          );
        }
      }
      return confirmed;
    } on DioException catch (error) {
      for (final event in pending) {
        await markFailed(event.clientEventId, error.toString());
      }
      return 0;
    } catch (error) {
      for (final event in pending) {
        await markFailed(event.clientEventId, error.toString());
      }
      return 0;
    }
  }

  /// Clean up completed receipts older than 14 days
  Future<void> cleanupCompletedReceipts() async {
    if (!_initialized) return;
    final cutoff = DateTime.now().subtract(const Duration(days: 14));
    final oldCompleted = _box.values
        .where((e) => e.status == QueueStatus.completed && 
                      e.completedAt != null && 
                      e.completedAt!.isBefore(cutoff))
        .map((e) => e.clientEventId)
        .toList();
    if (oldCompleted.isNotEmpty) {
      await _box.deleteAll(oldCompleted);
      debugPrint('[OfflineQueue] Cleaned up ${oldCompleted.length} old completed receipts');
    }
  }

  /// Get all events (for debugging)
  List<OfflineEvent> getAllEvents() {
    if (!_initialized) return [];
    return _box.values.toList();
  }

  /// Get all failed events for manual retry
  List<OfflineEvent> getFailedEvents() {
    if (!_initialized) return [];
    return _box.values
        .where((e) => e.status == QueueStatus.failed)
        .toList()
      ..sort((a, b) => a.createdAt.compareTo(b.createdAt));
  }

  /// Get all conflict events for manual resolution
  List<OfflineEvent> getConflictEvents() {
    if (!_initialized) return [];
    return _box.values
        .where((e) => e.status == QueueStatus.conflict)
        .toList()
      ..sort((a, b) => a.createdAt.compareTo(b.createdAt));
  }

  /// Get count of failed events
  int getFailedEventsCount() {
    if (!_initialized) return 0;
    return _box.values.where((e) => e.status == QueueStatus.failed).length;
  }

  /// Get count of conflict events
  int getConflictEventsCount() {
    if (!_initialized) return 0;
    return _box.values.where((e) => e.status == QueueStatus.conflict).length;
  }

  /// Retry all failed and conflict events by resetting them to pending
  Future<void> retryFailedEvents() async {
    if (!_initialized) return;
    
    final failedEvents = _box.values
        .where((e) => e.status == QueueStatus.failed || e.status == QueueStatus.conflict)
        .toList();
    
    for (final event in failedEvents) {
      final updated = OfflineEvent(
        clientEventId: event.clientEventId,
        type: event.type,
        payload: event.payload,
        status: QueueStatus.pending,
        createdAt: event.createdAt,
        retryCount: 0,
        errorMessage: null,
        conflictDetails: null,
      );
      await _box.put(event.clientEventId, updated);
    }
    
    debugPrint('[OfflineQueue] Reset ${failedEvents.length} failed/conflict events to pending for retry');
  }

  /// Clear all completed events
  Future<void> clearCompleted() async {
    if (!_initialized) return;
    
    final completedKeys = _box.values
        .where((e) => e.status == QueueStatus.completed)
        .map((e) => e.clientEventId)
        .toList();
    
    await _box.deleteAll(completedKeys);
  }

  /// Generate a unique client event ID (16 cryptographically random bytes).
  String _generateClientId() {
    final random = Random.secure();
    final bytes = List<int>.generate(16, (_) => random.nextInt(256));
    final timestamp = DateTime.now().microsecondsSinceEpoch;
    return '${timestamp.toRadixString(36)}_${base64Url.encode(bytes)}';
  }

  /// Get queue statistics
  Map<String, int> getStats() {
    if (!_initialized) return {};
    
    final stats = <String, int>{};
    for (final status in QueueStatus.values) {
      stats[status.name] = _box.values
          .where((e) => e.status == status)
          .length;
    }
    return stats;
  }
}

/// Hive adapter for OfflineEvent
class _OfflineEventAdapter extends TypeAdapter<OfflineEvent> {
  @override
  final int typeId = 0;

  @override
  OfflineEvent read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{};
    for (int i = 0; i < numOfFields; i++) {
      fields[reader.readByte()] = reader.read();
    }

    QueueStatus parseStatus(dynamic raw) {
      if (raw is int && raw >= 0 && raw < QueueStatus.values.length) {
        return QueueStatus.values[raw];
      }
      if (raw is String) {
        return QueueStatus.values.firstWhere(
          (e) => e.name == raw,
          orElse: () => QueueStatus.pending,
        );
      }
      return QueueStatus.pending;
    }

    return OfflineEvent(
      clientEventId: fields[0] as String,
      type: fields[1] as String,
      payload: Map<String, dynamic>.from(fields[2] as Map),
      status: parseStatus(fields[3]),
      createdAt: DateTime.fromMillisecondsSinceEpoch(fields[4] as int),
      syncedAt: fields[5] != null ? DateTime.fromMillisecondsSinceEpoch(fields[5] as int) : null,
      retryCount: fields[6] as int? ?? 0,
      errorMessage: fields[7] as String?,
      conflictDetails: fields[8] != null ? Map<String, dynamic>.from(fields[8] as Map) : null,
      completedAt: fields[9] != null ? DateTime.fromMillisecondsSinceEpoch(fields[9] as int) : null,
    );
  }

  @override
  void write(BinaryWriter writer, OfflineEvent obj) {
    writer.writeByte(10); // number of fields
    writer.writeByte(0);
    writer.write(obj.clientEventId);
    writer.writeByte(1);
    writer.write(obj.type);
    writer.writeByte(2);
    writer.write(obj.payload);
    writer.writeByte(3);
    writer.write(obj.status.index);
    writer.writeByte(4);
    writer.write(obj.createdAt.millisecondsSinceEpoch);
    writer.writeByte(5);
    writer.write(obj.syncedAt?.millisecondsSinceEpoch);
    writer.writeByte(6);
    writer.write(obj.retryCount);
    writer.writeByte(7);
    writer.write(obj.errorMessage);
    writer.writeByte(8);
    writer.write(obj.conflictDetails);
    writer.writeByte(9);
    writer.write(obj.completedAt?.millisecondsSinceEpoch);
  }
}

/// Singleton instance
final offlineQueue = OfflineQueue();
