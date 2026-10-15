import 'package:flutter_test/flutter_test.dart';
import 'package:thaibahive_mobile/features/attendance/data/services/presence_enforcement_timing.dart';

void main() {
  group('PresenceCheckThrottle', () {
    late PresenceCheckThrottle throttle;
    final t0 = DateTime(2026, 10, 15, 9, 0);

    setUp(() {
      throttle = PresenceCheckThrottle();
    });

    test('first check always runs', () {
      expect(
        throttle.shouldRun(interval: const Duration(minutes: 10), now: t0),
        isTrue,
      );
    });

    test('blocks checks inside the interval window', () {
      throttle.shouldRun(interval: const Duration(minutes: 10), now: t0);
      expect(
        throttle.shouldRun(
          interval: const Duration(minutes: 10),
          now: t0.add(const Duration(minutes: 9)),
        ),
        isFalse,
      );
    });

    test('allows checks once the interval has elapsed', () {
      throttle.shouldRun(interval: const Duration(minutes: 10), now: t0);
      expect(
        throttle.shouldRun(
          interval: const Duration(minutes: 10),
          now: t0.add(const Duration(minutes: 10)),
        ),
        isTrue,
      );
    });

    test('reset allows an immediate check after restart', () {
      throttle.shouldRun(interval: const Duration(minutes: 10), now: t0);
      throttle.reset();
      expect(
        throttle.shouldRun(
          interval: const Duration(minutes: 10),
          now: t0.add(const Duration(seconds: 1)),
        ),
        isTrue,
      );
    });
  });

  group('GraceTracker', () {
    late GraceTracker tracker;
    final t0 = DateTime(2026, 10, 15, 9, 0);

    setUp(() {
      tracker = GraceTracker();
    });

    test('first outside sample starts the window without firing', () {
      expect(tracker.markOutside(t0, graceMinutes: 5), isFalse);
      expect(tracker.isOutside, isTrue);
    });

    test('fires once wall-clock grace has elapsed', () {
      tracker.markOutside(t0, graceMinutes: 5);
      expect(
        tracker.markOutside(t0.add(const Duration(minutes: 4)), graceMinutes: 5),
        isFalse,
      );
      expect(
        tracker.markOutside(t0.add(const Duration(minutes: 5)), graceMinutes: 5),
        isTrue,
      );
      // Still outside → stays fired on subsequent samples (parity with old
      // tick-count behaviour, which also re-fired every tick after grace).
      expect(
        tracker.markOutside(t0.add(const Duration(minutes: 6)), graceMinutes: 5),
        isTrue,
      );
    });

    test('markWithin closes the window and restarts it on next outside', () {
      tracker.markOutside(t0, graceMinutes: 5);
      tracker.markWithin();
      expect(tracker.isOutside, isFalse);

      final t1 = t0.add(const Duration(hours: 1));
      expect(tracker.markOutside(t1, graceMinutes: 5), isFalse);
      expect(
        tracker.markOutside(t1.add(const Duration(minutes: 5)), graceMinutes: 5),
        isTrue,
      );
    });

    test('grace of zero fires on the first outside sample', () {
      expect(tracker.markOutside(t0, graceMinutes: 0), isTrue);
    });
  });
}
