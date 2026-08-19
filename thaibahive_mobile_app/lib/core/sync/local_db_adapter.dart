import 'dart:convert';
import 'package:hive/hive.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'hive_migration_handler.dart';

class LocalDbRecord {
  final String id;
  final String entityType;
  final String mutationType; // CREATE | UPDATE | DELETE
  final Map<String, dynamic> payload;
  final String clientTimestamp;
  final String syncStatus; // PENDING | SYNCED | CONFLICT
  final int priority;

  LocalDbRecord({
    required this.id,
    required this.entityType,
    required this.mutationType,
    required this.payload,
    required this.clientTimestamp,
    this.syncStatus = 'PENDING',
    this.priority = 0,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'entityType': entityType,
        'mutationType': mutationType,
        'payload': payload,
        'clientTimestamp': clientTimestamp,
        'syncStatus': syncStatus,
        'priority': priority,
      };

  factory LocalDbRecord.fromJson(Map<String, dynamic> json) => LocalDbRecord(
        id: json['id'],
        entityType: json['entityType'],
        mutationType: json['mutationType'],
        payload: Map<String, dynamic>.from(json['payload'] ?? {}),
        clientTimestamp: json['clientTimestamp'],
        syncStatus: json['syncStatus'] ?? 'PENDING',
        priority: json['priority'] ?? 0,
      );
}

class LocalDbAdapter {
  Box<String>? _box;
  final Map<String, LocalDbRecord> _memoryFallback = {};
  bool _isHiveInitialized = false;

  static const String boxName = 'encrypted_outbox_queue_v1';
  static const String keyStorageKey = 'hive_encryption_key_v1';
  static const FlutterSecureStorage _secureStorage = FlutterSecureStorage();
  static List<int>? _encryptionKey;

  static Future<List<int>> _getOrCreateEncryptionKey() async {
    if (_encryptionKey == null) {
      try {
        final existingKeyBase64 = await _secureStorage.read(key: keyStorageKey);
        if (existingKeyBase64 != null) {
          _encryptionKey = base64Decode(existingKeyBase64);
        } else {
          final newKey = Hive.generateSecureKey();
          await _secureStorage.write(key: keyStorageKey, value: base64Encode(newKey));
          _encryptionKey = newKey;
        }
      } catch (_) {
        _encryptionKey = Hive.generateSecureKey();
      }
    }
    return _encryptionKey!;
  }

  Future<void> init() async {
    try {
      await HiveMigrationHandler.checkAndMigrate();
      final key = await _getOrCreateEncryptionKey();
      _box = await Hive.openBox<String>(
        boxName,
        encryptionCipher: HiveAesCipher(key),
      );
      _isHiveInitialized = true;
    } catch (e) {
      // In test environments where Hive native path isn't initialized, fallback to memory
      _isHiveInitialized = false;
    }
  }

  Future<void> insert(LocalDbRecord record) async {
    final jsonStr = jsonEncode(record.toJson());
    if (_isHiveInitialized && _box != null) {
      await _box!.put(record.id, jsonStr);
    } else {
      _memoryFallback[record.id] = record;
    }
  }

  Future<List<LocalDbRecord>> getPendingMutations() async {
    if (_isHiveInitialized && _box != null) {
      final records = <LocalDbRecord>[];
      for (final key in _box!.keys) {
        final val = _box!.get(key);
        if (val != null) {
          final record = LocalDbRecord.fromJson(jsonDecode(val));
          if (record.syncStatus == 'PENDING') {
            records.add(record);
          }
        }
      }
      records.sort((a, b) => b.priority.compareTo(a.priority));
      return records;
    } else {
      final records = _memoryFallback.values
          .where((r) => r.syncStatus == 'PENDING')
          .toList();
      records.sort((a, b) => b.priority.compareTo(a.priority));
      return records;
    }
  }

  Future<void> updateStatus(String id, String status) async {
    if (_isHiveInitialized && _box != null) {
      final val = _box!.get(id);
      if (val != null) {
        final record = LocalDbRecord.fromJson(jsonDecode(val));
        final updated = LocalDbRecord(
          id: record.id,
          entityType: record.entityType,
          mutationType: record.mutationType,
          payload: record.payload,
          clientTimestamp: record.clientTimestamp,
          syncStatus: status,
          priority: record.priority,
        );
        await _box!.put(id, jsonEncode(updated.toJson()));
      }
    } else {
      final record = _memoryFallback[id];
      if (record != null) {
        _memoryFallback[id] = LocalDbRecord(
          id: record.id,
          entityType: record.entityType,
          mutationType: record.mutationType,
          payload: record.payload,
          clientTimestamp: record.clientTimestamp,
          syncStatus: status,
          priority: record.priority,
        );
      }
    }
  }

  Future<void> clearSynced() async {
    if (_isHiveInitialized && _box != null) {
      final keysToRemove = <dynamic>[];
      for (final key in _box!.keys) {
        final val = _box!.get(key);
        if (val != null) {
          final record = LocalDbRecord.fromJson(jsonDecode(val));
          if (record.syncStatus == 'SYNCED') {
            keysToRemove.add(key);
          }
        }
      }
      await _box!.deleteAll(keysToRemove);
    } else {
      _memoryFallback.removeWhere((key, record) => record.syncStatus == 'SYNCED');
    }
  }
}
