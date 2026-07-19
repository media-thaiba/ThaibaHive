import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:thaibahive_mobile/core/network/api_client.dart';
import 'offline_queue.dart';

class OfflineSyncService {
  final ApiClient _apiClient = ApiClient();
  Timer? _timer;
  bool _isSyncing = false;

  void start() {
    debugPrint('[OfflineSyncService] Starting sync service...');
    // Run immediately on startup
    syncNow();
    // Run periodically every 45 seconds
    _timer = Timer.periodic(const Duration(seconds: 45), (_) => syncNow());
  }

  void stop() {
    _timer?.cancel();
    _timer = null;
  }

  Future<void> syncNow() async {
    if (_isSyncing) return;
    _isSyncing = true;

    try {
      final pendingEvents = offlineQueue.getPendingEvents();
      if (pendingEvents.isEmpty) {
        _isSyncing = false;
        return;
      }

      debugPrint('[OfflineSyncService] Found ${pendingEvents.length} pending events to sync');

      for (final event in pendingEvents) {
        await offlineQueue.markSyncing(event.clientEventId);
        
        try {
          if (event.type == 'attendance_nfc_checkin') {
            final payload = event.payload;
            final tagData = payload['tagData']?['payload'] as String? ??
                payload['tagData']?['id'] as String? ??
                'unknown';
            
            // Sync check-in with API using ApiClient
            final response = await _apiClient.dio.post('/attendance/check-in', data: {
              'method': 'nfc',
              'nfcTagId': tagData,
              if (payload['latitude'] != null) 'latitude': payload['latitude'],
              if (payload['longitude'] != null) 'longitude': payload['longitude'],
            });

            if (response.statusCode == 200 || response.statusCode == 201) {
              await offlineQueue.markCompleted(event.clientEventId);
              debugPrint('[OfflineSyncService] Sync completed for event: ${event.clientEventId}');
            } else {
              throw Exception('Unexpected status code: ${response.statusCode}');
            }
          } else {
            // Unsupported event type, mark completed to avoid blocking the queue
            await offlineQueue.markCompleted(event.clientEventId);
            debugPrint('[OfflineSyncService] Dropped unsupported event type: ${event.type}');
          }
        } catch (e) {
          debugPrint('[OfflineSyncService] Sync failed for event ${event.clientEventId}: $e');
          await offlineQueue.markFailed(event.clientEventId, e.toString());
        }
      }
    } catch (e) {
      debugPrint('[OfflineSyncService] Error during sync: $e');
    } finally {
      _isSyncing = false;
    }
  }
}

final offlineSyncService = OfflineSyncService();
