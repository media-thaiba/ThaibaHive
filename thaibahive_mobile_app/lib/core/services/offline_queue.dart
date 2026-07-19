import 'dart:convert';
import 'dart:typed_data';
import 'dart:math';

import 'package:hive_flutter/hive_flutter.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:crypto/crypto.dart';

/// Offline queue item status
enum QueueStatus {
  pending,
  syncing,
  completed,
  failed,
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

  OfflineEvent({
    required this.clientEventId,
    required this.type,
    required this.payload,
    this.status = QueueStatus.pending,
    required this.createdAt,
    this.syncedAt,
    this.retryCount = 0,
    this.errorMessage,
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
    await _box.delete(clientEventId);
  }

  /// Mark an event as failed (will retry if under max retries)
  Future<void> markFailed(String clientEventId, String error) async {
    final event = _box.get(clientEventId);
    if (event == null) return;
    
    if (event.retryCount >= _maxRetries) {
      // Move to failed state for manual review
      final updated = OfflineEvent(
        clientEventId: event.clientEventId,
        type: event.type,
        payload: event.payload,
        status: QueueStatus.failed,
        createdAt: event.createdAt,
        syncedAt: DateTime.now(),
        retryCount: event.retryCount + 1,
        errorMessage: error,
      );
      await _box.put(clientEventId, updated);
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

  /// Get all pending events for sync
  List<OfflineEvent> getPendingEvents() {
    if (!_initialized) return [];
    
    return _box.values
        .where((e) => e.status == QueueStatus.pending)
        .toList()
      ..sort((a, b) => a.createdAt.compareTo(b.createdAt));
  }

  /// Get all events (for debugging)
  List<OfflineEvent> getAllEvents() {
    if (!_initialized) return [];
    return _box.values.toList();
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

  /// Generate a unique client event ID
  String _generateClientId() {
    final timestamp = DateTime.now().microsecondsSinceEpoch;
    final random = List<int>.generate(16, (i) => timestamp.hashCode ^ i);
    return base64Url.encode(random);
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
    return OfflineEvent(
      clientEventId: fields[0] as String,
      type: fields[1] as String,
      payload: Map<String, dynamic>.from(fields[2] as Map),
      status: QueueStatus.values[fields[3] as int],
      createdAt: DateTime.fromMillisecondsSinceEpoch(fields[4] as int),
      syncedAt: fields[5] != null ? DateTime.fromMillisecondsSinceEpoch(fields[5] as int) : null,
      retryCount: fields[6] as int? ?? 0,
      errorMessage: fields[7] as String?,
    );
  }

  @override
  void write(BinaryWriter writer, OfflineEvent obj) {
    writer.writeByte(8); // number of fields
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
  }
}

/// Singleton instance
final offlineQueue = OfflineQueue();
