import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:thaibahive_mobile/models/attendance_model.dart';
import 'package:thaibahive_mobile/features/attendance/data/services/background_presence_service.dart';
import 'package:thaibahive_mobile/core/services/network_service.dart';
import 'package:thaibahive_mobile/core/services/offline_queue.dart';
import 'package:thaibahive_mobile/core/services/sync_coordinator.dart';
import 'attendance_repository.dart';

class AttendanceState {
  final bool isLoading;
  final String? error;
  final AttendanceStatsModel? stats;
  final List<AttendanceLogModel> logs;
  final AttendanceLogModel? lastAction;
  final GeofenceConfig? geofenceConfig;
  final bool isOfflineCheckOut; // Track if check-out was done offline
  final String? pendingCheckOutId; // ClientEventId of pending check-out

  const AttendanceState({
    this.isLoading = false,
    this.error,
    this.stats,
    this.logs = const [],
    this.lastAction,
    this.geofenceConfig,
    this.isOfflineCheckOut = false,
    this.pendingCheckOutId,
  });

  AttendanceState copyWith({
    bool? isLoading,
    String? error,
    bool clearError = false,
    AttendanceStatsModel? stats,
    List<AttendanceLogModel>? logs,
    AttendanceLogModel? lastAction,
    GeofenceConfig? geofenceConfig,
    bool? isOfflineCheckOut,
    String? pendingCheckOutId,
  }) {
    return AttendanceState(
      isLoading: isLoading ?? this.isLoading,
      error: clearError ? null : (error ?? this.error),
      stats: stats ?? this.stats,
      logs: logs ?? this.logs,
      lastAction: lastAction ?? this.lastAction,
      geofenceConfig: geofenceConfig ?? this.geofenceConfig,
      isOfflineCheckOut: isOfflineCheckOut ?? this.isOfflineCheckOut,
      pendingCheckOutId: pendingCheckOutId ?? this.pendingCheckOutId,
    );
  }
}

class GeofenceConfig {
  final double latitude;
  final double longitude;
  final double radius;
  final String? locationName;

  const GeofenceConfig({
    required this.latitude,
    required this.longitude,
    required this.radius,
    this.locationName,
  });

  factory GeofenceConfig.fromJson(Map<String, dynamic> json) {
    return GeofenceConfig(
      latitude: (json['latitude'] as num).toDouble(),
      longitude: (json['longitude'] as num).toDouble(),
      radius: (json['radius'] as num).toDouble(),
      locationName: json['locationName'] as String?,
    );
  }
}

class AttendanceNotifier extends StateNotifier<AttendanceState> {
  final AttendanceRepository _repository;
  final Ref? _ref;

  AttendanceNotifier(this._repository, [this._ref]) : super(const AttendanceState()) {
    refresh();
  }

  Future<void> refresh() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final results = await Future.wait([
        _repository.getStats(),
        _repository.getMyAttendance(limit: 10),
      ]);
      state = state.copyWith(
        isLoading: false,
        stats: results[0] as AttendanceStatsModel,
        logs: results[1] as List<AttendanceLogModel>,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'Failed to load attendance data: $e',
      );
    }
  }

  Future<void> checkIn({
    String method = 'qr',
    String? nfcTagId,
    String? qrCode,
    double? latitude,
    double? longitude,
  }) async {
    state = state.copyWith(isLoading: true, error: null);
    final isOnline = _ref?.read(isOnlineProvider) ?? true;

    if (!isOnline) {
      if (method == 'qr') {
        state = state.copyWith(
          isLoading: false,
          error: 'QR Check-in requires an active internet connection',
        );
        return;
      }

      if (method == 'nfc') {
        try {
          final event = await offlineQueue.enqueue(
            type: 'attendance_nfc_checkin',
            payload: {
              'locationId': 'default',
              'tagData': {'id': nfcTagId ?? 'unknown', 'payload': nfcTagId ?? 'unknown'},
              'timestamp': DateTime.now().toIso8601String(),
              if (latitude != null) 'latitude': latitude,
              if (longitude != null) 'longitude': longitude,
            },
          );
          state = state.copyWith(
            isLoading: false,
            error: null,
            pendingCheckOutId: event.clientEventId,
          );
          if (_ref != null) {
            await _ref!.read(syncCoordinatorProvider.notifier).syncNow(trigger: SyncTrigger.manual);
          }
          return;
        } catch (e) {
          state = state.copyWith(
            isLoading: false,
            error: 'Failed to queue NFC check-in offline: $e',
          );
          return;
        }
      }
    }

    try {
      final result = await _repository.checkIn(
        method: method,
        nfcTagId: nfcTagId,
        qrCode: qrCode,
        latitude: latitude,
        longitude: longitude,
      );

      // Parse geofence config from response if available
      GeofenceConfig? geofenceConfig;
      if (_repository.lastGeofenceConfig != null) {
        geofenceConfig = GeofenceConfig.fromJson(_repository.lastGeofenceConfig!);
      }

      await refresh();
      state = state.copyWith(
        isLoading: false,
        lastAction: result,
        geofenceConfig: geofenceConfig,
      );

      // Start background tracking if geofence config is available
      if (geofenceConfig != null) {
        await BackgroundPresenceService.instance.startTracking(
          attendanceId: result.id,
          officeLatitude: geofenceConfig.latitude,
          officeLongitude: geofenceConfig.longitude,
          geofenceRadius: geofenceConfig.radius,
        );
      }
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'Check-in failed: $e',
      );
    }
  }

  Future<void> checkOut() async {
    state = state.copyWith(isLoading: true, error: null);
    final isOnline = _ref?.read(isOnlineProvider) ?? true;
    
    if (!isOnline) {
      // Offline mode: enqueue check-out to offline queue
      try {
        final event = await offlineQueue.enqueue(
          type: 'attendance_punch',
          payload: {
            'mode': 'out',
            'at': DateTime.now().toIso8601String(),
          },
        );
        state = state.copyWith(
          isLoading: false,
          isOfflineCheckOut: true,
          pendingCheckOutId: event.clientEventId,
          error: null,
        );
        // Trigger immediate sync attempt via SyncCoordinator
        if (_ref != null) {
          await _ref!.read(syncCoordinatorProvider.notifier).syncNow(trigger: SyncTrigger.manual);
        }
        return;
      } catch (e) {
        state = state.copyWith(
          isLoading: false,
          error: 'Failed to queue check-out offline: $e',
          isOfflineCheckOut: false,
          pendingCheckOutId: null,
        );
        return;
      }
    }

    // Online mode: direct API call
    try {
      final result = await _repository.checkOut();
      await refresh();
      state = state.copyWith(
        isLoading: false,
        lastAction: result,
        isOfflineCheckOut: false,
        pendingCheckOutId: null,
      );

      // Stop background tracking
      await BackgroundPresenceService.instance.stopTracking();
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'Check-out failed: $e',
      );
    }
  }

  void clearError() {
    state = state.copyWith(clearError: true);
  }
}

final attendanceProvider =
    StateNotifierProvider<AttendanceNotifier, AttendanceState>((ref) {
  return AttendanceNotifier(ref.watch(attendanceRepositoryProvider), ref);
});
