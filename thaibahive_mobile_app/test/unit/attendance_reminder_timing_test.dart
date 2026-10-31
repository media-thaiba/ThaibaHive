import 'package:flutter_test/flutter_test.dart';
import 'package:thaibahive_mobile/features/attendance/data/services/attendance_reminder_timing.dart';

void main() {
  group('Attendance Reminder Timing Helper Tests', () {
    test('calculateDeterministicReminderId produces collision-free 32-bit IDs', () {
      final id1 = calculateDeterministicReminderId('2026-10-30', ShiftReminderType.preCheckin);
      final id2 = calculateDeterministicReminderId('2026-10-30', ShiftReminderType.postCheckinNudge);
      final id3 = calculateDeterministicReminderId('2026-10-30', ShiftReminderType.preCheckout);
      final id4 = calculateDeterministicReminderId('2026-10-31', ShiftReminderType.preCheckin);

      expect(id1, 202610301);
      expect(id2, 202610302);
      expect(id3, 202610303);
      expect(id4, 202610311);

      // Verify all IDs are unique
      final set = {id1, id2, id3, id4};
      expect(set.length, 4);

      // Verify well below Android 32-bit integer limit (2,147,483,647)
      expect(id1 < 2147483647, isTrue);
    });

    test('calculates correct time offsets for 9:00 AM - 5:00 PM shift', () {
      // Fixed clock: 7:00 AM on Monday Oct 26, 2026
      final mockClock = DateTime(2026, 10, 26, 7, 0);

      final slots = calculateReminderSchedule(
        clock: () => mockClock,
        shiftStartHour: 9,
        shiftStartMinute: 0,
        shiftEndHour: 17,
        shiftEndMinute: 0,
        nonWorkingWeekdays: {DateTime.sunday},
        approvedLeaveDates: {},
        windowDays: 1, // Only today
        isTodayCheckedIn: false,
        isTodayCheckedOut: false,
      );

      // Expect preCheckin at 8:45 AM and nudge at 9:10 AM
      expect(slots.length, 2);
      expect(slots[0].type, ShiftReminderType.preCheckin);
      expect(slots[0].hour, 8);
      expect(slots[0].minute, 45);

      expect(slots[1].type, ShiftReminderType.postCheckinNudge);
      expect(slots[1].hour, 9);
      expect(slots[1].minute, 10);
    });

    test('suppresses Sundays and approved leaves', () {
      // Mock clock: Saturday Oct 31, 2026 (7:00 AM)
      final mockClock = DateTime(2026, 10, 31, 7, 0);

      final slots = calculateReminderSchedule(
        clock: () => mockClock,
        shiftStartHour: 9,
        shiftStartMinute: 0,
        shiftEndHour: 17,
        shiftEndMinute: 0,
        nonWorkingWeekdays: {DateTime.sunday}, // Sunday Nov 1 should be suppressed
        approvedLeaveDates: {'2026-11-02'}, // Monday Nov 2 should be suppressed
        windowDays: 4, // Sat (Oct 31), Sun (Nov 1), Mon (Nov 2), Tue (Nov 3)
        isTodayCheckedIn: false,
        isTodayCheckedOut: false,
      );

      final dateKeys = slots.map((s) => s.dateKey).toSet();

      expect(dateKeys.contains('2026-10-31'), isTrue); // Saturday included
      expect(dateKeys.contains('2026-11-01'), isFalse); // Sunday suppressed
      expect(dateKeys.contains('2026-11-02'), isFalse); // Approved leave suppressed
      expect(dateKeys.contains('2026-11-03'), isTrue); // Tuesday included
    });

    test('suppresses pre-checkin and nudge when user is already checked in today', () {
      // Mock clock: 9:30 AM, already checked in
      final mockClock = DateTime(2026, 10, 26, 9, 30);

      final slots = calculateReminderSchedule(
        clock: () => mockClock,
        shiftStartHour: 9,
        shiftStartMinute: 0,
        shiftEndHour: 17,
        shiftEndMinute: 0,
        nonWorkingWeekdays: {DateTime.sunday},
        approvedLeaveDates: {},
        windowDays: 1,
        isTodayCheckedIn: true,
        isTodayCheckedOut: false,
      );

      // Today should only schedule checkout at 4:55 PM
      expect(slots.length, 1);
      expect(slots[0].type, ShiftReminderType.preCheckout);
      expect(slots[0].hour, 16);
      expect(slots[0].minute, 55);
    });

    test('suppresses all reminders for today when already checked out', () {
      // Mock clock: 3:00 PM, checked out early
      final mockClock = DateTime(2026, 10, 26, 15, 0);

      final slots = calculateReminderSchedule(
        clock: () => mockClock,
        shiftStartHour: 9,
        shiftStartMinute: 0,
        shiftEndHour: 17,
        shiftEndMinute: 0,
        nonWorkingWeekdays: {DateTime.sunday},
        approvedLeaveDates: {},
        windowDays: 1,
        isTodayCheckedIn: true,
        isTodayCheckedOut: true,
      );

      expect(slots.isEmpty, isTrue);
    });

    test('does not schedule reminders in the past for today', () {
      // Mock clock: 9:05 AM (preCheckin at 8:45 has passed, nudge at 9:10 is in the future)
      final mockClock = DateTime(2026, 10, 26, 9, 5);

      final slots = calculateReminderSchedule(
        clock: () => mockClock,
        shiftStartHour: 9,
        shiftStartMinute: 0,
        shiftEndHour: 17,
        shiftEndMinute: 0,
        nonWorkingWeekdays: {DateTime.sunday},
        approvedLeaveDates: {},
        windowDays: 1,
        isTodayCheckedIn: false,
        isTodayCheckedOut: false,
      );

      // 8:45 AM has passed, so only 9:10 AM nudge should be scheduled
      expect(slots.length, 1);
      expect(slots[0].type, ShiftReminderType.postCheckinNudge);
      expect(slots[0].hour, 9);
      expect(slots[0].minute, 10);
    });
  });
}
