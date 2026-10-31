import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:intl/intl.dart';
import 'package:timezone/data/latest_all.dart' as tz;
import 'package:timezone/timezone.dart' as tz;
import 'package:thaibahive_mobile/features/attendance/data/attendance_provider.dart';
import 'package:thaibahive_mobile/features/attendance/data/services/attendance_reminder_service.dart';
import 'package:thaibahive_mobile/features/attendance/data/services/attendance_reminder_timing.dart';
import 'package:thaibahive_mobile/models/attendance_model.dart';

class FakeNotificationPluginPort implements NotificationPluginPort {
  final Map<int, String> scheduled = {};
  bool cancelAllCalled = false;

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
    scheduled[id] = '$title: $body at $scheduledDate';
  }

  @override
  Future<void> cancel(int id) async {
    scheduled.remove(id);
  }

  @override
  Future<void> cancelAll() async {
    cancelAllCalled = true;
    scheduled.clear();
  }

  @override
  Future<List<PendingNotificationRequest>> pendingNotificationRequests() async {
    return scheduled.entries
        .map((e) => PendingNotificationRequest(e.key, '', '', ''))
        .toList();
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUpAll(() async {
    tz.initializeTimeZones();
    // Initialize temporary Hive storage for unit testing
    Hive.init('./test_hive_tmp');
    await Hive.openBox(AttendanceReminderService.hiveBoxName);
  });

  tearDownAll(() async {
    await Hive.box(AttendanceReminderService.hiveBoxName).close();
    await Hive.deleteBoxFromDisk(AttendanceReminderService.hiveBoxName);
  });

  group('AttendanceReminderService Tests', () {
    test('cancelAllReminders clears fake plugin port', () async {
      final fakePort = FakeNotificationPluginPort();
      final service = AttendanceReminderService(pluginPort: fakePort);

      fakePort.scheduled[1001] = 'Sample';
      expect(fakePort.scheduled.isNotEmpty, isTrue);

      await service.cancelAllReminders();
      expect(fakePort.cancelAllCalled, isTrue);
      expect(fakePort.scheduled.isEmpty, isTrue);
    });

    test('cancelTodayCheckInReminders removes deterministic today IDs', () async {
      final fakePort = FakeNotificationPluginPort();
      final service = AttendanceReminderService(pluginPort: fakePort);

      final todayKey = DateFormat('yyyy-MM-dd').format(DateTime.now());
      final preCheckinId = calculateDeterministicReminderId(todayKey, ShiftReminderType.preCheckin);
      final nudgeId = calculateDeterministicReminderId(todayKey, ShiftReminderType.postCheckinNudge);
      final checkoutId = calculateDeterministicReminderId(todayKey, ShiftReminderType.preCheckout);

      fakePort.scheduled[preCheckinId] = 'Pre-checkin';
      fakePort.scheduled[nudgeId] = 'Nudge';
      fakePort.scheduled[checkoutId] = 'Checkout';

      expect(fakePort.scheduled.length, 3);

      await service.cancelTodayCheckInReminders();

      // Check-in reminders removed, checkout reminder preserved
      expect(fakePort.scheduled.containsKey(preCheckinId), isFalse);
      expect(fakePort.scheduled.containsKey(nudgeId), isFalse);
      expect(fakePort.scheduled.containsKey(checkoutId), isTrue);
    });

    test('cancelTodayCheckOutReminder removes today checkout ID', () async {
      final fakePort = FakeNotificationPluginPort();
      final service = AttendanceReminderService(pluginPort: fakePort);

      final todayKey = DateFormat('yyyy-MM-dd').format(DateTime.now());
      final checkoutId = calculateDeterministicReminderId(todayKey, ShiftReminderType.preCheckout);

      fakePort.scheduled[checkoutId] = 'Checkout';
      expect(fakePort.scheduled.containsKey(checkoutId), isTrue);

      await service.cancelTodayCheckOutReminder();
      expect(fakePort.scheduled.containsKey(checkoutId), isFalse);
    });

    test('rebuildSchedule respects disabled toggle', () async {
      final fakePort = FakeNotificationPluginPort();
      final service = AttendanceReminderService(pluginPort: fakePort);

      await service.setReminderEnabled('user_123', false);

      const state = AttendanceState(
        stats: AttendanceStatsModel(todayStatus: 'absent'),
      );

      await service.rebuildSchedule(state, userId: 'user_123');
      expect(fakePort.scheduled.isEmpty, isTrue);
    });

    test('rebuildSchedule populates rolling window when enabled', () async {
      final fakePort = FakeNotificationPluginPort();
      final service = AttendanceReminderService(pluginPort: fakePort);

      await service.setReminderEnabled('user_456', true);

      const state = AttendanceState(
        stats: AttendanceStatsModel(todayStatus: 'absent'),
      );

      await service.rebuildSchedule(state, userId: 'user_456');

      // 7-day rolling window excluding Sunday produces multiple slots
      expect(fakePort.scheduled.isNotEmpty, isTrue);
    });
  });
}
