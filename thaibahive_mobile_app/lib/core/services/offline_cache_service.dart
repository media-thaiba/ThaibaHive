import 'dart:convert';
import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class OfflineCacheService {
  static final OfflineCacheService _instance = OfflineCacheService._internal();
  factory OfflineCacheService() => _instance;
  OfflineCacheService._internal();

  static const String _boxName = 'offline_data_cache';
  static const String _keyBoxName = 'offline_cache_master_key';

  static const Duration defaultTTL = Duration(minutes: 15);
  static const Duration staffDirectoryTTL = Duration(hours: 24);
  static const Duration expensesTTL = Duration(hours: 6);

  late Box<String> _box;
  final FlutterSecureStorage _storage = const FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );
  bool _initialized = false;

  /// Initialize Hive box with master encryption key
  Future<void> init() async {
    if (_initialized) return;

    await Hive.initFlutter();
    final encryptionKey = await _getEncryptionKey();

    _box = await Hive.openBox<String>(
      _boxName,
      encryptionCipher: HiveAesCipher(encryptionKey),
    );

    _initialized = true;
  }

  Future<Uint8List> _getEncryptionKey() async {
    String? keyString = await _storage.read(key: _keyBoxName);
    if (keyString == null) {
      final random = Random.secure();
      final keyBytes = List<int>.generate(32, (i) => random.nextInt(256));
      keyString = base64Url.encode(keyBytes);
      await _storage.write(key: _keyBoxName, value: keyString);
    }
    return base64Url.decode(keyString);
  }

  /// Write data payload to Hive cache with current timestamp
  Future<void> setCache(String key, dynamic data) async {
    if (!_initialized) await init();

    final payload = {
      'cachedAt': DateTime.now().toIso8601String(),
      'data': data,
    };

    await _box.put(key, jsonEncode(payload));
    if (kDebugMode) debugPrint('[OfflineCacheService] Cache updated for key: $key');
  }

  /// Alias for setCache for backward compatibility
  Future<void> saveCache(String key, dynamic data) => setCache(key, data);

  /// Read cached payload if unexpired (returns null if missing or expired)
  Future<dynamic> getCache(String key, {Duration? customTTL, Duration? maxAge}) async {
    if (!_initialized) await init();

    final raw = _box.get(key);
    if (raw == null) return null;

    try {
      final map = jsonDecode(raw) as Map<String, dynamic>;
      final cachedAtStr = map['cachedAt'] as String?;
      if (cachedAtStr == null) return null;

      final cachedAt = DateTime.parse(cachedAtStr);
      final ttl = customTTL ?? maxAge ?? (key.contains('staff') ? staffDirectoryTTL : defaultTTL);

      if (DateTime.now().difference(cachedAt) > ttl) {
        if (kDebugMode) debugPrint('[OfflineCacheService] Cache expired for key: $key');
        return null;
      }

      return map['data'];
    } catch (e) {
      if (kDebugMode) debugPrint('[OfflineCacheService] Error reading cache key $key: $e');
      return null;
    }
  }

  /// Check if cache entry exists and is older than TTL (for UI staleness banner)
  Future<bool> isCacheStale(String key, {Duration? customTTL}) async {
    if (!_initialized) await init();

    final raw = _box.get(key);
    if (raw == null) return false;

    try {
      final map = jsonDecode(raw) as Map<String, dynamic>;
      final cachedAtStr = map['cachedAt'] as String?;
      if (cachedAtStr == null) return true;

      final cachedAt = DateTime.parse(cachedAtStr);
      final maxAge = customTTL ?? (key == 'staff_directory_cache' ? staffDirectoryTTL : key == 'expenses_cache' ? expensesTTL : defaultTTL);
      return DateTime.now().difference(cachedAt) > maxAge;
    } catch (_) {
      return true;
    }
  }

  /// Invalidate/remove a specific cache entry
  Future<void> invalidateCache(String key) async {
    if (!_initialized) await init();
    await _box.delete(key);
    if (kDebugMode) debugPrint('[OfflineCacheService] Cache invalidated for key: $key');
  }

  /// Rollback optimistic write when OfflineQueue encounters a terminal failure
  Future<void> rollbackOptimisticWrite(String clientEventId, {String? targetCacheKey}) async {
    if (!_initialized) await init();

    // Map common event types/keys if targetCacheKey not explicitly passed
    final keyToInvalidate = targetCacheKey ?? _inferKeyFromEventId(clientEventId);
    if (keyToInvalidate != null) {
      await invalidateCache(keyToInvalidate);
      if (kDebugMode) debugPrint('[OfflineCacheService] Optimistic write rolled back for key: $keyToInvalidate (Event: $clientEventId)');
    }
  }

  String? _inferKeyFromEventId(String eventId) {
    if (eventId.contains('leave')) return 'leaves_cache';
    if (eventId.contains('task')) return 'tasks_cache';
    if (eventId.contains('approval')) return 'approvals_cache';
    if (eventId.contains('announcement')) return 'announcements_cache';
    if (eventId.contains('expense')) return 'expenses_cache';
    return null;
  }
}

final offlineCacheService = OfflineCacheService();
