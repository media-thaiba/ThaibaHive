// Pure, testable helper for attendance reminder schedule calculations.
// Zero dependencies on Flutter UI or system clock.

enum ShiftReminderType {
  preCheckin(1),
  postCheckinNudge(2),
  preCheckout(3);

  final int code;
  const ShiftReminderType(this.code);
}

class ScheduledReminderSlot {
  final String dateKey; // YYYY-MM-DD
  final int hour;
  final int minute;
  final ShiftReminderType type;
  final String title;
  final String body;
  final int id;

  const ScheduledReminderSlot({
    required this.dateKey,
    required this.hour,
    required this.minute,
    required this.type,
    required this.title,
    required this.body,
    required this.id,
  });

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ScheduledReminderSlot &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          dateKey == other.dateKey &&
          hour == other.hour &&
          minute == other.minute &&
          type == other.type;

  @override
  int get hashCode => id.hashCode;

  @override
  String toString() =>
      'ScheduledReminderSlot(id: $id, dateKey: $dateKey, $hour:${minute.toString().padLeft(2, '0')}, type: $type)';
}

/// Generates a deterministic 32-bit integer notification ID from a date key and reminder type.
/// Formula: (YYYYMMDD * 10) + type.code
/// Example: 2026-10-30 preCheckin -> 202610301 (safe under Android 2.14B int limit)
int calculateDeterministicReminderId(String dateKey, ShiftReminderType type) {
  final cleanDate = int.parse(dateKey.replaceAll('-', ''));
  return (cleanDate * 10) + type.code;
}

/// Calculates the concrete reminder slots for a rolling window of [windowDays].
/// Fully deterministic and clock-injected for testing.
List<ScheduledReminderSlot> calculateReminderSchedule({
  required DateTime Function() clock,
  required int shiftStartHour,
  required int shiftStartMinute,
  required int shiftEndHour,
  required int shiftEndMinute,
  required Set<int> nonWorkingWeekdays,
  required Set<String> approvedLeaveDates,
  int windowDays = 7,
  bool isTodayCheckedIn = false,
  bool isTodayCheckedOut = false,
}) {
  final now = clock();
  final slots = <ScheduledReminderSlot>[];

  // Helper to adjust hours/minutes by offset
  (int, int) addMinutes(int hour, int minute, int deltaMinutes) {
    int totalMinutes = (hour * 60) + minute + deltaMinutes;
    while (totalMinutes < 0) {
      totalMinutes += 24 * 60;
    }
    totalMinutes = totalMinutes % (24 * 60);
    return (totalMinutes ~/ 60, totalMinutes % 60);
  }

  final (preCheckinH, preCheckinM) = addMinutes(shiftStartHour, shiftStartMinute, -15);
  final (nudgeH, nudgeM) = addMinutes(shiftStartHour, shiftStartMinute, 10);
  final (preCheckoutH, preCheckoutM) = addMinutes(shiftEndHour, shiftEndMinute, -5);

  bool isTimeInPast(DateTime targetDay, int hour, int minute) {
    if (targetDay.year == now.year &&
        targetDay.month == now.month &&
        targetDay.day == now.day) {
      if (now.hour > hour) return true;
      if (now.hour == hour && now.minute >= minute) return true;
    }
    return false;
  }

  for (int dayOffset = 0; dayOffset < windowDays; dayOffset++) {
    final dayDate = now.add(Duration(days: dayOffset));
    final dateKey = '${dayDate.year.toString().padLeft(4, '0')}-'
        '${dayDate.month.toString().padLeft(2, '0')}-'
        '${dayDate.day.toString().padLeft(2, '0')}';

    // 1. Skip non-working days (e.g. Sunday)
    if (nonWorkingWeekdays.contains(dayDate.weekday)) {
      continue;
    }

    // 2. Skip approved leaves
    if (approvedLeaveDates.contains(dateKey)) {
      continue;
    }

    final isToday = dayOffset == 0;

    // A. Pre-checkin reminder (15 min before shift start)
    if (!isToday || (!isTodayCheckedIn && !isTimeInPast(dayDate, preCheckinH, preCheckinM))) {
      slots.add(ScheduledReminderSlot(
        dateKey: dateKey,
        hour: preCheckinH,
        minute: preCheckinM,
        type: ShiftReminderType.preCheckin,
        title: 'Check-In Reminder',
        body: 'Your shift starts in 15 minutes. Have a productive day ahead!',
        id: calculateDeterministicReminderId(dateKey, ShiftReminderType.preCheckin),
      ));
    }

    // B. Post-checkin nudge (10 min after shift start)
    if (!isToday || (!isTodayCheckedIn && !isTimeInPast(dayDate, nudgeH, nudgeM))) {
      slots.add(ScheduledReminderSlot(
        dateKey: dateKey,
        hour: nudgeH,
        minute: nudgeM,
        type: ShiftReminderType.postCheckinNudge,
        title: 'Attendance Reminder',
        body: 'Did you forget to clock in? Your attendance is still pending.',
        id: calculateDeterministicReminderId(dateKey, ShiftReminderType.postCheckinNudge),
      ));
    }

    // C. Pre-checkout reminder (5 min before shift end)
    // For today, only schedule if already checked in and not yet checked out
    if (isToday) {
      if (isTodayCheckedIn && !isTodayCheckedOut && !isTimeInPast(dayDate, preCheckoutH, preCheckoutM)) {
        slots.add(ScheduledReminderSlot(
          dateKey: dateKey,
          hour: preCheckoutH,
          minute: preCheckoutM,
          type: ShiftReminderType.preCheckout,
          title: 'Shift Ending Soon',
          body: 'Your shift ends in 5 minutes. Don\'t forget to clock out!',
          id: calculateDeterministicReminderId(dateKey, ShiftReminderType.preCheckout),
        ));
      }
    } else {
      // Future days: schedule checkout reminder unconditionally
      slots.add(ScheduledReminderSlot(
        dateKey: dateKey,
        hour: preCheckoutH,
        minute: preCheckoutM,
        type: ShiftReminderType.preCheckout,
        title: 'Shift Ending Soon',
        body: 'Your shift ends in 5 minutes. Don\'t forget to clock out!',
        id: calculateDeterministicReminderId(dateKey, ShiftReminderType.preCheckout),
      ));
    }
  }

  return slots;
}
