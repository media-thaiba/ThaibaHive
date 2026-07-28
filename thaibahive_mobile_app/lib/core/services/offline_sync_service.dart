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
        await _handleEvent(event, event.clientEventId);
      }
    } catch (e) {
      debugPrint('[OfflineSyncService] Error during sync: $e');
    } finally {
      _isSyncing = false;
    }
  }

  /// Handle individual event based on its type
  Future<void> _handleEvent(OfflineEvent event, String clientEventId) async {
    try {
      switch (event.type) {
        case 'attendance_nfc':
          await _handleAttendanceNfc(event, clientEventId);
          break;
        case 'task_create':
          await _handleTaskCreate(event, clientEventId);
          break;
        case 'task_update':
          await _handleTaskUpdate(event, clientEventId);
          break;
        case 'task_delete':
          await _handleTaskDelete(event, clientEventId);
          break;
        case 'approval_approve':
          await _handleApprovalApprove(event, clientEventId);
          break;
        case 'approval_reject':
          await _handleApprovalReject(event, clientEventId);
          break;
        case 'leave_apply':
          await _handleLeaveApply(event, clientEventId);
          break;
        case 'expense_create':
          await _handleExpenseCreate(event, clientEventId);
          break;
        default:
          // Unsupported event type, mark completed to avoid blocking the queue
          await offlineQueue.markCompleted(clientEventId);
          debugPrint('[OfflineSyncService] Dropped unsupported event type: ${event.type}');
      }
    } catch (e) {
      debugPrint('[OfflineSyncService] Sync failed for event $clientEventId: $e');
      await offlineQueue.markFailed(clientEventId, e.toString());
    }
  }

  Future<void> _handleAttendanceNfc(OfflineEvent event, String clientEventId) async {
    final response = await _apiClient.dio.post('/attendance/nfc', data: event.payload);
    if (response.statusCode == 200 || response.statusCode == 201) {
      await offlineQueue.markCompleted(clientEventId);
      debugPrint('[OfflineSyncService] NFC attendance synced: $clientEventId');
    } else {
      throw Exception('Unexpected status: ${response.statusCode}');
    }
  }

  Future<void> _handleTaskCreate(OfflineEvent event, String clientEventId) async {
    final response = await _apiClient.dio.post('/tasks', data: event.payload);
    if (response.statusCode == 200 || response.statusCode == 201) {
      await offlineQueue.markCompleted(clientEventId);
      debugPrint('[OfflineSyncService] Task created: $clientEventId');
    } else {
      throw Exception('Task create failed: ${response.statusCode}');
    }
  }

  Future<void> _handleTaskUpdate(OfflineEvent event, String clientEventId) async {
    final id = event.payload['id'] as String?;
    if (id == null) throw Exception('Missing task ID');
    final data = Map<String, dynamic>.from(event.payload)..remove('id');
    final response = await _apiClient.dio.put('/tasks/$id', data: data);
    if (response.statusCode == 200 || response.statusCode == 201) {
      await offlineQueue.markCompleted(clientEventId);
      debugPrint('[OfflineSyncService] Task updated: $clientEventId');
    } else {
      throw Exception('Task update failed: ${response.statusCode}');
    }
  }

  Future<void> _handleTaskDelete(OfflineEvent event, String clientEventId) async {
    final id = event.payload['id'] as String?;
    if (id == null) throw Exception('Missing task ID');
    final response = await _apiClient.dio.delete('/tasks/$id');
    if (response.statusCode == 200 || response.statusCode == 204) {
      await offlineQueue.markCompleted(clientEventId);
      debugPrint('[OfflineSyncService] Task deleted: $clientEventId');
    } else {
      throw Exception('Task delete failed: ${response.statusCode}');
    }
  }

  Future<void> _handleApprovalApprove(OfflineEvent event, String clientEventId) async {
    final id = event.payload['id'] as String?;
    if (id == null) throw Exception('Missing approval ID');
    final response = await _apiClient.dio.post('/approvals/$id/approve', 
        data: event.payload['notes'] != null ? {'notes': event.payload['notes']} : null);
    if (response.statusCode == 200 || response.statusCode == 201) {
      await offlineQueue.markCompleted(clientEventId);
      debugPrint('[OfflineSyncService] Approval approved: $clientEventId');
    } else {
      throw Exception('Approval approve failed: ${response.statusCode}');
    }
  }

  Future<void> _handleApprovalReject(OfflineEvent event, String clientEventId) async {
    final id = event.payload['id'] as String?;
    if (id == null) throw Exception('Missing approval ID');
    final response = await _apiClient.dio.post('/approvals/$id/reject',
        data: event.payload['notes'] != null ? {'notes': event.payload['notes']} : null);
    if (response.statusCode == 200 || response.statusCode == 201) {
      await offlineQueue.markCompleted(clientEventId);
      debugPrint('[OfflineSyncService] Approval rejected: $clientEventId');
    } else {
      throw Exception('Approval reject failed: ${response.statusCode}');
    }
  }

  Future<void> _handleLeaveApply(OfflineEvent event, String clientEventId) async {
    final response = await _apiClient.dio.post('/leaves', data: event.payload);
    if (response.statusCode == 200 || response.statusCode == 201) {
      await offlineQueue.markCompleted(clientEventId);
      debugPrint('[OfflineSyncService] Leave applied: $clientEventId');
    } else {
      throw Exception('Leave apply failed: ${response.statusCode}');
    }
  }

  Future<void> _handleExpenseCreate(OfflineEvent event, String clientEventId) async {
    final response = await _apiClient.dio.post('/expense-claims', data: event.payload);
    if (response.statusCode == 200 || response.statusCode == 201) {
      await offlineQueue.markCompleted(clientEventId);
      debugPrint('[OfflineSyncService] Expense created: $clientEventId');
    } else {
      throw Exception('Expense create failed: ${response.statusCode}');
    }
  }

  /// Retry all failed events by resetting them to pending and triggering sync
  Future<void> retryFailedEvents() async {
    final failedEvents = offlineQueue.getFailedEvents();
    if (failedEvents.isEmpty) {
      debugPrint('[OfflineSyncService] No failed events to retry');
      return;
    }

    debugPrint('[OfflineSyncService] Retrying ${failedEvents.length} failed events');

    for (final event in failedEvents) {
      // Reset failed event to pending for retry
      await offlineQueue.resetToPending(event.clientEventId);
    }

    // Trigger sync
    await syncNow();
  }
}

final offlineSyncService = OfflineSyncService();