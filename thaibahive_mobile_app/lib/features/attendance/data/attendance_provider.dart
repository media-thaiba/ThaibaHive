import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:thaibahive_mobile/models/attendance_model.dart';
import 'package:thaibahive_mobile/features/attendance/data/services/background_presence_service.dart';
import 'package:thaibahive_mobile/features/settings/data/settings_provider.dart';
import 'package:thaibahive_mobile/core/services/network_service.dart';
import 'package:thaibahive_mobile/core/services/offline_queue.dart';
import 'package:thaibahive_mobile/core/services/sync_coordinator.dart';
import 'dart:async';
import 'package:intl/intl.dart';
import 'attendance_repository.dart';
import 'attendance_sync_service.dart';
import 'services/attendance_reminder_service.dart';
import '../../auth/data/auth_state.dart';

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
      final serverStats = results[0] as AttendanceStatsModel;
      // Preserve a local optimistic check-in the server has not seen yet
      // (offline punch awaiting sync-coordinator flush) instead of wiping it,
      // along with 'present' so the status badge stays "On Duty" until sync.
      final localCheckIn = state.stats?.lastCheckIn;
      final localOnShift = state.stats?.isOnShift ?? false;
      // A punch that is still in-flight locally (optimistic state set, sync
      // pending) or an offline-queued punch must never be reverted to
      // "off shift" by a stale server response.
      final hasPendingPunch =
          state.pendingCheckOutId != null || state.isOfflineCheckOut;
      final preserveOnShift =
          (localCheckIn != null && serverStats.lastCheckIn == null) ||
              (hasPendingPunch && localOnShift);
      final mergedStats = preserveOnShift
          ? AttendanceStatsModel(
              todayStatus: 'present',
              lastCheckIn: localCheckIn ?? serverStats.lastCheckIn,
              lastCheckOut: serverStats.lastCheckOut,
              presentDays: serverStats.presentDays,
              absentDays: serverStats.absentDays,
              lateDays: serverStats.lateDays,
              halfDays: serverStats.halfDays,
              totalWorkedHours: serverStats.totalWorkedHours,
              latestEvent: 'in',
              isOnShift: true,
              latestEventAt: serverStats.latestEventAt ?? state.stats?.latestEventAt,
              shiftName: serverStats.shiftName,
              shiftStartTime: serverStats.shiftStartTime,
              shiftEndTime: serverStats.shiftEndTime,
            )
          : serverStats;
      state = state.copyWith(
        isLoading: false,
        stats: mergedStats,
        logs: results[1] as List<AttendanceLogModel>,
      );

      // If server provides a customized shift assignment for this staff member, update reminder schedule
      if (serverStats.shiftStartTime != null && serverStats.shiftEndTime != null) {
        final reminderSvc = _ref?.read(attendanceReminderServiceProvider);
        if (reminderSvc != null) {
          final sParts = serverStats.shiftStartTime!.split(':');
          final eParts = serverStats.shiftEndTime!.split(':');
          if (sParts.length >= 2 && eParts.length >= 2) {
            final sH = int.tryParse(sParts[0]) ?? 9;
            final sM = int.tryParse(sParts[1]) ?? 0;
            final eH = int.tryParse(eParts[0]) ?? 17;
            final eM = int.tryParse(eParts[1]) ?? 0;

            final userId = _ref?.read(authProvider).user?.id;
            final currentSh = reminderSvc.getShiftStartHour(userId);
            final currentSm = reminderSvc.getShiftStartMinute(userId);
            final currentEh = reminderSvc.getShiftEndHour(userId);
            final currentEm = reminderSvc.getShiftEndMinute(userId);

            if (sH != currentSh || sM != currentSm || eH != currentEh || eM != currentEm) {
              await reminderSvc.saveShiftTimes(
                userId: userId,
                startHour: sH,
                startMinute: sM,
                endHour: eH,
                endMinute: eM,
              );
            }
          }
        }
      }

      // Synchronize reminder schedule cancellation with fresh server status
      if (mergedStats.isOnShift == true || mergedStats.lastCheckIn != null) {
        _ref?.read(attendanceReminderServiceProvider).cancelTodayCheckInReminders();
      }
      if (mergedStats.lastCheckOut != null) {
        _ref?.read(attendanceReminderServiceProvider).cancelTodayCheckOutReminder();
      }
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'Failed to load attendance data: $e',
      );
    }
  }

  /// One-tap campus check-in / check-out with one-shot GPS capture.
  /// Integrated directly with POST /api/attendance/sync append-only ledger.
  Future<AttendancePunchOutcome?> punchOneTap({
    required bool isCheckIn,
    AttendancePunchMethod method = AttendancePunchMethod.geofence,
    String? qrCode,
    String? nfcTagId,
  }) async {
    // Button debouncing: ignore if already loading
    if (state.isLoading) return null;

    state = state.copyWith(isLoading: true, error: null);

    try {
      final syncService = _ref?.read(attendanceSyncServiceProvider);
      if (syncService == null) {
        state = state.copyWith(isLoading: false, error: 'Attendance service unavailable');
        return null;
      }

      // One-shot GPS capture
      final position = await syncService.capturePosition();

      final outcome = await syncService.recordPunch(
        kind: isCheckIn ? AttendancePunchKind.inEvent : AttendancePunchKind.outEvent,
        method: method,
        position: position,
        qrCode: qrCode,
        nfcTagId: nfcTagId,
      );

      if (outcome.success) {
        // Cancel scheduled reminders deterministically upon successful punch
        if (isCheckIn) {
          _ref?.read(attendanceReminderServiceProvider).cancelTodayCheckInReminders();
        } else {
          _ref?.read(attendanceReminderServiceProvider).cancelTodayCheckOutReminder();
        }

        final nowStr = DateFormat('hh:mm a').format(DateTime.now());
        final currentStats = state.stats;

        // Optimistic UI state update
        final updatedStats = currentStats != null
            ? AttendanceStatsModel(
                todayStatus: isCheckIn ? 'present' : currentStats.todayStatus,
                lastCheckIn: isCheckIn ? nowStr : currentStats.lastCheckIn,
                // A fresh check-in (overtime / extra shift) clears the previous
                // check-out so the UI reflects an active on-shift state.
                lastCheckOut: !isCheckIn ? nowStr : null,
                presentDays: currentStats.presentDays,
                absentDays: currentStats.absentDays,
                lateDays: currentStats.lateDays,
                halfDays: currentStats.halfDays,
                totalWorkedHours: currentStats.totalWorkedHours,
                latestEvent: isCheckIn ? 'in' : 'out',
                isOnShift: isCheckIn,
                latestEventAt: DateTime.now().millisecondsSinceEpoch,
                shiftName: currentStats.shiftName,
                shiftStartTime: currentStats.shiftStartTime,
                shiftEndTime: currentStats.shiftEndTime,
              )
            : AttendanceStatsModel(
                todayStatus: isCheckIn ? 'present' : 'absent',
                lastCheckIn: isCheckIn ? nowStr : null,
                lastCheckOut: !isCheckIn ? nowStr : null,
                presentDays: isCheckIn ? 1 : 0,
                absentDays: 0,
                lateDays: 0,
                halfDays: 0,
                totalWorkedHours: 0.0,
                latestEvent: isCheckIn ? 'in' : 'out',
                isOnShift: isCheckIn,
                latestEventAt: DateTime.now().millisecondsSinceEpoch,
              );

        state = state.copyWith(
          isLoading: false,
          stats: updatedStats,
          isOfflineCheckOut: outcome.isQueuedOffline,
          pendingCheckOutId: outcome.clientEventId,
          error: null,
        );

        // Background refresh to catch up with server ledger stats — but never
        // for an offline-queued punch: the server has not seen it yet, so a
        // refresh would revert the optimistic check-in before the sync
        // coordinator flushes the queue.
        if (!outcome.isQueuedOffline) unawaited(refresh());
        return outcome;
      } else {
        state = state.copyWith(
          isLoading: false,
          error: outcome.message ?? 'Punch rejected',
        );
        return outcome;
      }
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'Punch failed: $e',
      );
      return null;
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
      _ref?.read(attendanceReminderServiceProvider).cancelTodayCheckInReminders();
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
          staffId: _ref?.read(currentUserProvider)?.id,
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
      _ref?.read(attendanceReminderServiceProvider).cancelTodayCheckOutReminder();
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
