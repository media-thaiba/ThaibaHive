import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'offline_queue.dart';
import 'qr_anti_replay.dart';

/// Centralized service initializer for the mobile app
/// 
/// Initializes all services in the correct order with proper error handling.
class ServiceInitializer {
  static bool _initialized = false;
  static final ServiceInitializer _instance = ServiceInitializer._();
  factory ServiceInitializer() => _instance;
  ServiceInitializer._();

  /// Initialize all services
  Future<void> init() async {
    if (_initialized) return;
    
    try {
      debugPrint('[ServiceInitializer] Starting initialization...');
      
      // 1. Initialize secure storage (no dependencies)
      const secureStorage = FlutterSecureStorage(
        aOptions: AndroidOptions(encryptedSharedPreferences: true),
      );
      debugPrint('[ServiceInitializer] Secure storage initialized');
      
      // 2. Initialize offline queue (depends on secure storage for key)
      await offlineQueue.init();
      debugPrint('[ServiceInitializer] Offline queue initialized');
      
      // 3. Initialize QR anti-replay service
      await qrAntiReplay.init();
      debugPrint('[ServiceInitializer] QR anti-replay initialized');
      
      // 4. Clean up expired cache entries
      await qrAntiReplay.cleanupCache();
      debugPrint('[ServiceInitializer] Cache cleanup completed');
      
      _initialized = true;
      debugPrint('[ServiceInitializer] All services initialized successfully');
    } catch (e, stackTrace) {
      debugPrint('[ServiceInitializer] Initialization failed: $e');
      debugPrint('[ServiceInitializer] Stack trace: $stackTrace');
      rethrow;
    }
  }

  /// Check if services are initialized
  bool get isInitialized => _initialized;

  /// Get service health status
  Future<Map<String, dynamic>> getHealthStatus() async {
    return {
      'initialized': _initialized,
      'offlineQueueStats': offlineQueue.getStats(),
      'qrCacheStats': qrAntiReplay.getStats(),
    };
  }
}

/// Global service initializer instance
final serviceInitializer = ServiceInitializer();
