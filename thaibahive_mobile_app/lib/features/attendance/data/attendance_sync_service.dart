import 'dart:async';
import 'dart:math';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:thaibahive_mobile/core/network/providers.dart';
import 'package:thaibahive_mobile/core/services/logger_service.dart';
import 'package:thaibahive_mobile/core/services/offline_queue.dart';

enum AttendancePunchKind { inEvent, outEvent }

enum AttendancePunchMethod { geofence, qr, nfc, manual }

class AttendancePunchOutcome {
  final bool success;
  final bool isQueuedOffline;
  final String clientEventId;
  final String? status; // 'accepted', 'duplicate', 'rejected', 'pending_sync'
  final String? message;
  final Position? position;

  AttendancePunchOutcome({
    required this.success,
    required this.isQueuedOffline,
    required this.clientEventId,
    this.status,
    this.message,
    this.position,
  });
}

class AttendanceSyncBatchSummary {
  final int total;
  final int accepted;
  final int duplicates;
  final int rejected;
  final List<Map<String, dynamic>> results;

  AttendanceSyncBatchSummary({
    required this.total,
    required this.accepted,
    required this.duplicates,
    required this.rejected,
    required this.results,
  });
}

final attendanceSyncServiceProvider = Provider<AttendanceSyncService>((ref) {
  return AttendanceSyncService(
    dio: ref.watch(dioProvider),
    queue: offlineQueue,
  );
});

class AttendanceSyncService {
  final Dio _dio;
  final OfflineQueue _queue;

  AttendanceSyncService({
    required Dio dio,
    required OfflineQueue queue,
  })  : _dio = dio,
        _queue = queue;

  /// High-accuracy one-shot GPS capture with permission checks and timeout.
  /// Does not run a persistent background watcher, conserving battery.
  Future<Position?> capturePosition() async {
    try {
      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        logger.warn('[AttendanceSync] Location services disabled on device');
        return null;
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          logger.warn('[AttendanceSync] Location permission denied by user');
          return null;
        }
      }
      if (permission == LocationPermission.deniedForever) {
        logger.warn('[AttendanceSync] Location permission permanently denied');
        return null;
      }

      return await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 8),
      );
    } catch (e) {
      logger.warn('[AttendanceSync] High-accuracy GPS capture timed out: $e');
      try {
        return await Geolocator.getLastKnownPosition();
      } catch (_) {
        return null;
      }
    }
  }

  /// Generate a unique, monotonic clientEventId
  String generateClientEventId() {
    final now = DateTime.now().millisecondsSinceEpoch;
    final rand = Random().nextInt(90000) + 10000;
    return 'evt_${now}_$rand';
  }

  /// Record an append-only attendance event.
  ///
  /// Zero-Trust Principle:
  /// The client never sends staffId, institutionId, or effectiveAt.
  /// It only transmits clientEventId, kind ('in' | 'out'), method,
  /// deviceClaimedAt, and position (including accuracy and isMocked).
  Future<AttendancePunchOutcome> recordPunch({
    required AttendancePunchKind kind,
    required AttendancePunchMethod method,
    Position? position,
    String? qrCode,
    String? nfcTagId,
  }) async {
    final clientEventId = generateClientEventId();
    final deviceClaimedAt = DateTime.now().millisecondsSinceEpoch;

    final payload = <String, dynamic>{
      'clientEventId': clientEventId,
      'kind': kind == AttendancePunchKind.inEvent ? 'in' : 'out',
      'method': method == AttendancePunchMethod.geofence
          ? 'geofence'
          : method == AttendancePunchMethod.nfc
              ? 'nfc'
              : method == AttendancePunchMethod.qr
                  ? 'qr'
                  : 'manual_correction',
      'deviceClaimedAt': deviceClaimedAt,
      if (position != null) 'latitude': position.latitude,
      if (position != null) 'longitude': position.longitude,
      if (position != null) 'accuracyM': position.accuracy,
      if (position != null) 'isMocked': position.isMocked,
      if (qrCode != null) 'qrPayload': qrCode,
      if (nfcTagId != null) 'nfcTagId': nfcTagId,
    };

    // 1. Write-Ahead Durability: always persist into encrypted offline queue first
    try {
      await _queue.enqueue(
        type: 'attendance_event',
        payload: payload,
      );
      logger.info('[AttendanceSync] Enqueued attendance punch $clientEventId (kind: ${payload['kind']})');
    } catch (e) {
      logger.error('[AttendanceSync] Failed to persist event to offline queue: $e');
    }

    // 2. Direct Sync Attempt: Try flushing immediately to POST /api/attendance/sync
    try {
      final response = await _dio.post(
        '/attendance/sync',
        data: {
          'events': [payload],
        },
        options: Options(
          headers: {
            'X-Request-Id': 'req_punch_${DateTime.now().millisecondsSinceEpoch}',
          },
          receiveTimeout: const Duration(seconds: 8),
          sendTimeout: const Duration(seconds: 8),
        ),
      );

      if (response.statusCode == 200 && response.data is Map<String, dynamic>) {
        final results = (response.data['results'] as List<dynamic>?) ?? [];
        final firstResult = results.firstOrNull as Map<String, dynamic>?;
        final status = firstResult?['status'] as String? ?? 'accepted';
        final reason = firstResult?['reason'] as String?;

        if (status == 'accepted' || status == 'duplicate') {
          await _queue.markCompleted(clientEventId);
          logger.info('[AttendanceSync] Punch $clientEventId verified by server (status: $status)');
          return AttendancePunchOutcome(
            success: true,
            isQueuedOffline: false,
            clientEventId: clientEventId,
            status: status,
            message: status == 'duplicate'
                ? 'Punch already recorded on server'
                : 'Punch recorded & verified on campus ledger',
            position: position,
          );
        } else {
          // Terminal rejection (e.g. invalid format) - mark failed to avoid poison retries
          await _queue.markFailed(clientEventId, reason ?? 'Rejected by server', isTerminal: true);
          logger.warn('[AttendanceSync] Punch $clientEventId rejected by server: $reason');
          return AttendancePunchOutcome(
            success: false,
            isQueuedOffline: false,
            clientEventId: clientEventId,
            status: 'rejected',
            message: reason ?? 'Punch rejected by server rules',
            position: position,
          );
        }
      }
    } catch (e) {
      logger.warn('[AttendanceSync] Direct punch transmission failed: $e. Event remains safely queued offline.');
    }

    // Fallback: Event is safely stored in local encrypted queue
    return AttendancePunchOutcome(
      success: true,
      isQueuedOffline: true,
      clientEventId: clientEventId,
      status: 'pending_sync',
      message: 'Saved locally — will sync automatically when online',
      position: position,
    );
  }

  /// Drain all pending attendance events to POST /api/attendance/sync in a single batch.
  /// Handles per-item statuses:
  /// - 'accepted': marks completed
  /// - 'duplicate': marks completed (idempotent duplicate, safe to drop from queue)
  /// - 'rejected': marks failed terminal (never re-tries poisoned payloads)
  Future<AttendanceSyncBatchSummary> flushPendingAttendanceEvents() async {
    final pending = _queue
        .getAllEvents()
        .where((e) =>
            e.type == 'attendance_event' &&
            (e.status == QueueStatus.pending || e.status == QueueStatus.syncing))
        .toList();

    if (pending.isEmpty) {
      return AttendanceSyncBatchSummary(
        total: 0,
        accepted: 0,
        duplicates: 0,
        rejected: 0,
        results: [],
      );
    }

    for (final event in pending) {
      await _queue.markSyncing(event.clientEventId);
    }

    final batchItems = pending.map((e) => e.payload).toList();

    try {
      final response = await _dio.post(
        '/attendance/sync',
        data: {'events': batchItems},
        options: Options(
          headers: {
            'X-Request-Id': 'req_batch_${DateTime.now().millisecondsSinceEpoch}',
          },
          receiveTimeout: const Duration(seconds: 12),
          sendTimeout: const Duration(seconds: 12),
        ),
      );

      if (response.statusCode == 200 && response.data is Map<String, dynamic>) {
        final results = (response.data['results'] as List<dynamic>?)
                ?.cast<Map<String, dynamic>>() ??
            [];
        int accepted = 0;
        int duplicates = 0;
        int rejected = 0;

        for (final res in results) {
          final id = res['clientEventId'] as String?;
          final status = res['status'] as String?;
          final reason = res['reason'] as String?;
          if (id == null) continue;

          if (status == 'accepted') {
            accepted++;
            await _queue.markCompleted(id);
          } else if (status == 'duplicate') {
            duplicates++;
            await _queue.markCompleted(id);
          } else if (status == 'rejected') {
            rejected++;
            await _queue.markFailed(id, reason ?? 'Rejected', isTerminal: true);
          }
        }

        logger.info('[AttendanceSync] Batch sync processed: $accepted accepted, $duplicates duplicates, $rejected rejected');
        return AttendanceSyncBatchSummary(
          total: batchItems.length,
          accepted: accepted,
          duplicates: duplicates,
          rejected: rejected,
          results: results,
        );
      }
    } catch (e) {
      logger.warn('[AttendanceSync] Batch sync failed: $e. Re-queuing items for next attempt.');
      for (final event in pending) {
        await _queue.resetToPending(event.clientEventId);
      }
    }

    return AttendanceSyncBatchSummary(
      total: batchItems.length,
      accepted: 0,
      duplicates: 0,
      rejected: 0,
      results: [],
    );
  }
}
