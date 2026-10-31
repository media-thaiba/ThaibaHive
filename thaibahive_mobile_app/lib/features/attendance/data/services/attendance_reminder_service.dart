import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:intl/intl.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:timezone/data/latest_all.dart' as tz;
import 'package:timezone/timezone.dart' as tz;

import '../../../../core/services/logger_service.dart';
import '../attendance_provider.dart';
import 'attendance_reminder_timing.dart';

/// Abstract port for notification plugin operations.
/// Allows pure fake implementations during unit testing without native plugin mocks.
abstract class NotificationPluginPort {
  Future<void> schedule({
    required int id,
    required String title,
    required String body,
    required tz.TZDateTime scheduledDate,
    required String channelId,
    required String channelName,
    required String channelDescription,
    String? payload,
  });

  Future<void> cancel(int id);
  Future<void> cancelAll();
  Future<List<PendingNotificationRequest>> pendingNotificationRequests();
}

/// Default implementation wrapping FlutterLocalNotificationsPlugin.
class DefaultNotificationPluginPort implements NotificationPluginPort {
  final FlutterLocalNotificationsPlugin _plugin;
  DefaultNotificationPluginPort([FlutterLocalNotificationsPlugin? plugin])
      : _plugin = plugin ?? FlutterLocalNotificationsPlugin();

  @override
  Future<void> schedule({
    required int id,
    required String title,
    required String body,
    required tz.TZDateTime scheduledDate,
    required String channelId,
    required String channelName,
    required String channelDescription,
    String? payload,
  }) async {
    final androidDetails = AndroidNotificationDetails(
      channelId,
      channelName,
      channelDescription: channelDescription,
      importance: Importance.max,
      priority: Priority.high,
      visibility: NotificationVisibility.public,
      playSound: true,
      enableVibration: true,
    );

    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    final details = NotificationDetails(android: androidDetails, iOS: iosDetails);

    try {
      await _plugin.zonedSchedule(
        id,
        title,
        body,
        scheduledDate,
        details,
        androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
        uiLocalNotificationDateInterpretation:
            UILocalNotificationDateInterpretation.absoluteTime,
        payload: payload,
      );
    } catch (e) {
      // Fallback for devices without exact alarm permission (Android 12/13/14)
      await _plugin.zonedSchedule(
        id,
        title,
        body,
        scheduledDate,
        details,
        androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
        uiLocalNotificationDateInterpretation:
            UILocalNotificationDateInterpretation.absoluteTime,
        payload: payload,
      );
    }
  }

  @override
  Future<void> cancel(int id) async => await _plugin.cancel(id);

  @override
  Future<void> cancelAll() async => await _plugin.cancelAll();

  @override
  Future<List<PendingNotificationRequest>> pendingNotificationRequests() async =>
      await _plugin.pendingNotificationRequests();
}

final attendanceReminderServiceProvider = Provider<AttendanceReminderService>((ref) {
  final service = AttendanceReminderService(ref: ref);
  return service;
});

class AttendanceReminderService {
  final Ref? _ref;
  final NotificationPluginPort _pluginPort;
  final LoggerService _logger;
  static const String channelId = 'thaibahive_shift_reminders_v1';
  static const String channelName = 'Shift & Check-in Reminders';
  static const String channelDescription =
      'High-priority lockscreen reminders for attendance check-ins and shifts';

  static const String hiveBoxName = 'attendance_reminder_prefs';

  bool _initialized = false;
  tz.Location? _location;

  AttendanceReminderService({
    Ref? ref,
    NotificationPluginPort? pluginPort,
    LoggerService? logger,
  })  : _ref = ref,
        _pluginPort = pluginPort ?? DefaultNotificationPluginPort(),
        _logger = logger ?? LoggerService();

  Future<void> initialize() async {
    if (_initialized) return;

    try {
      tz.initializeTimeZones();
      _location = tz.getLocation('Asia/Kolkata');
    } catch (_) {
      _location = tz.local;
    }

    if (!Hive.isBoxOpen(hiveBoxName)) {
      try {
        await Hive.openBox(hiveBoxName);
      } catch (e) {
        _logger.error('Failed to open Hive box for attendance reminders', e);
      }
    }

    _initialized = true;
  }

  /// Get the user-specific Hive key for a given preference.
  String _keyFor(String key, String? userId) =>
      userId != null ? '${key}_$userId' : key;

  /// Returns whether attendance reminders are enabled for [userId].
  /// Defaults to false (Opt-In policy for pilot).
  bool isReminderEnabled(String? userId) {
    if (!Hive.isBoxOpen(hiveBoxName)) return false;
    final box = Hive.box(hiveBoxName);
    return box.get(_keyFor('enabled', userId), defaultValue: false) as bool;
  }

  /// Updates whether attendance reminders are enabled for [userId].
  Future<void> setReminderEnabled(String? userId, bool enabled) async {
    if (!Hive.isBoxOpen(hiveBoxName)) {
      await Hive.openBox(hiveBoxName);
    }
    final box = Hive.box(hiveBoxName);
    await box.put(_keyFor('enabled', userId), enabled);

    if (enabled) {
      if (_ref != null) {
        final state = _ref.read(attendanceProvider);
        await rebuildSchedule(state, userId: userId);
      }
    } else {
      await cancelAllReminders();
    }
  }

  /// Configured Shift Start Hour (default 9 AM).
  int getShiftStartHour(String? userId) {
    if (!Hive.isBoxOpen(hiveBoxName)) return 9;
    final box = Hive.box(hiveBoxName);
    return box.get(_keyFor('shift_start_hour', userId), defaultValue: 9) as int;
  }

  /// Configured Shift Start Minute (default 0).
  int getShiftStartMinute(String? userId) {
    if (!Hive.isBoxOpen(hiveBoxName)) return 0;
    final box = Hive.box(hiveBoxName);
    return box.get(_keyFor('shift_start_minute', userId), defaultValue: 0) as int;
  }

  /// Configured Shift End Hour (default 5 PM / 17).
  int getShiftEndHour(String? userId) {
    if (!Hive.isBoxOpen(hiveBoxName)) return 17;
    final box = Hive.box(hiveBoxName);
    return box.get(_keyFor('shift_end_hour', userId), defaultValue: 17) as int;
  }

  /// Configured Shift End Minute (default 0).
  int getShiftEndMinute(String? userId) {
    if (!Hive.isBoxOpen(hiveBoxName)) return 0;
    final box = Hive.box(hiveBoxName);
    return box.get(_keyFor('shift_end_minute', userId), defaultValue: 0) as int;
  }

  /// Saves custom shift hours for the pilot user.
  Future<void> saveShiftTimes({
    required String? userId,
    required int startHour,
    required int startMinute,
    required int endHour,
    required int endMinute,
  }) async {
    if (!Hive.isBoxOpen(hiveBoxName)) {
      await Hive.openBox(hiveBoxName);
    }
    final box = Hive.box(hiveBoxName);
    await box.put(_keyFor('shift_start_hour', userId), startHour);
    await box.put(_keyFor('shift_start_minute', userId), startMinute);
    await box.put(_keyFor('shift_end_hour', userId), endHour);
    await box.put(_keyFor('shift_end_minute', userId), endMinute);

    if (isReminderEnabled(userId) && _ref != null) {
      final state = _ref.read(attendanceProvider);
      await rebuildSchedule(state, userId: userId);
    }
  }

  /// Rebuilds the rolling 7-day schedule, strictly taking current attendance state into account.
  Future<void> rebuildSchedule(AttendanceState state, {String? userId}) async {
    await initialize();

    if (!isReminderEnabled(userId)) {
      _logger.info('Attendance reminders disabled for user. Skipping schedule.');
      await _pluginPort.cancelAll();
      return;
    }

    final stats = state.stats;
    final isTodayCheckedIn = stats?.isOnShift == true || stats?.lastCheckIn != null;
    final isTodayCheckedOut = stats?.lastCheckOut != null;

    final loc = _location ?? tz.local;
    final startHour = getShiftStartHour(userId);
    final startMinute = getShiftStartMinute(userId);
    final endHour = getShiftEndHour(userId);
    final endMinute = getShiftEndMinute(userId);

    // Cancel all existing scheduled alarms first to prevent ghost duplicates
    await _pluginPort.cancelAll();

    final slots = calculateReminderSchedule(
      clock: () => DateTime.now(),
      shiftStartHour: startHour,
      shiftStartMinute: startMinute,
      shiftEndHour: endHour,
      shiftEndMinute: endMinute,
      nonWorkingWeekdays: {DateTime.sunday},
      approvedLeaveDates: {},
      windowDays: 7,
      isTodayCheckedIn: isTodayCheckedIn,
      isTodayCheckedOut: isTodayCheckedOut,
    );

    for (final slot in slots) {
      try {
        final parts = slot.dateKey.split('-');
        final year = int.parse(parts[0]);
        final month = int.parse(parts[1]);
        final day = int.parse(parts[2]);

        final scheduledDate = tz.TZDateTime(
          loc,
          year,
          month,
          day,
          slot.hour,
          slot.minute,
        );

        await _pluginPort.schedule(
          id: slot.id,
          title: slot.title,
          body: slot.body,
          scheduledDate: scheduledDate,
          channelId: channelId,
          channelName: channelName,
          channelDescription: channelDescription,
          payload: '/attendance',
        );
      } catch (e) {
        _logger.error('Failed to schedule reminder ${slot.id} for ${slot.dateKey}', e);
      }
    }

    _logger.info('Scheduled ${slots.length} attendance reminders for rolling window.');
  }

  /// Cancels today's check-in reminders (both 8:45 preCheckin and 9:10 nudge).
  Future<void> cancelTodayCheckInReminders() async {
    final todayKey = DateFormat('yyyy-MM-dd').format(DateTime.now());
    final preCheckinId = calculateDeterministicReminderId(todayKey, ShiftReminderType.preCheckin);
    final nudgeId = calculateDeterministicReminderId(todayKey, ShiftReminderType.postCheckinNudge);

    await _pluginPort.cancel(preCheckinId);
    await _pluginPort.cancel(nudgeId);
    _logger.info('Cancelled today check-in reminders ($preCheckinId, $nudgeId).');
  }

  /// Cancels today's checkout reminder.
  Future<void> cancelTodayCheckOutReminder() async {
    final todayKey = DateFormat('yyyy-MM-dd').format(DateTime.now());
    final checkoutId = calculateDeterministicReminderId(todayKey, ShiftReminderType.preCheckout);

    await _pluginPort.cancel(checkoutId);
    _logger.info('Cancelled today check-out reminder ($checkoutId).');
  }

  /// Cancels all scheduled reminders (called upon logout / session revocation).
  Future<void> cancelAllReminders() async {
    await _pluginPort.cancelAll();
    _logger.info('Cancelled all attendance reminders.');
  }

  /// Telemetry helper: inspects pending requests on app resume.
  Future<int> auditPendingReminders() async {
    try {
      final pending = await _pluginPort.pendingNotificationRequests();
      return pending.length;
    } catch (_) {
      return 0;
    }
  }
}
