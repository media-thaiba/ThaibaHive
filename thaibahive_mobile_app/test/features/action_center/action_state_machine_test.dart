import 'package:flutter_test/flutter_test.dart';
import 'package:thaibahive_mobile/features/action_center/action_state_machine.dart';

void main() {
  group('ActionStatus transition guard table', () {
    const legal = <ActionStatus, Set<ActionEvent>>{
      ActionStatus.pending: {
        ActionEvent.acknowledge,
        ActionEvent.snooze,
        ActionEvent.dismiss,
        ActionEvent.complete,
        ActionEvent.expire,
      },
      ActionStatus.acknowledged: {
        ActionEvent.reopen,
        ActionEvent.snooze,
        ActionEvent.dismiss,
        ActionEvent.complete,
        ActionEvent.expire,
      },
      ActionStatus.snoozed: {
        ActionEvent.wake,
        ActionEvent.acknowledge,
        ActionEvent.dismiss,
        ActionEvent.complete,
        ActionEvent.expire,
      },
      ActionStatus.dismissed: {},
      ActionStatus.completed: {},
      ActionStatus.expired: {},
    };

    test('exhaustive: every (from, event) pair matches the documented matrix', () {
      for (final from in ActionStatus.values) {
        for (final event in ActionEvent.values) {
          final result = nextStatus(from, event);
          if (legal[from]!.contains(event)) {
            expect(result, isNotNull,
                reason: '$from + $event should be legal');
          } else {
            expect(result, isNull,
                reason: '$from + $event should be rejected');
          }
        }
      }
    });

    test('pending: acknowledge → acknowledged, snooze → snoozed, expire → expired',
        () {
      expect(nextStatus(ActionStatus.pending, ActionEvent.acknowledge),
          ActionStatus.acknowledged);
      expect(
          nextStatus(ActionStatus.pending, ActionEvent.snooze), ActionStatus.snoozed);
      expect(nextStatus(ActionStatus.pending, ActionEvent.expire),
          ActionStatus.expired);
      expect(nextStatus(ActionStatus.pending, ActionEvent.wake), isNull);
      expect(nextStatus(ActionStatus.pending, ActionEvent.reopen), isNull);
    });

    test('snoozed: lazy wake returns to pending (snoozed → pending column)', () {
      expect(
          nextStatus(ActionStatus.snoozed, ActionEvent.wake), ActionStatus.pending);
      expect(
          nextStatus(ActionStatus.snoozed, ActionEvent.acknowledge),
          ActionStatus.acknowledged);
      // snooze → snooze is illegal (re-snooze must go through wake first)
      expect(nextStatus(ActionStatus.snoozed, ActionEvent.snooze), isNull);
    });

    test('acknowledged can be re-opened to pending', () {
      expect(nextStatus(ActionStatus.acknowledged, ActionEvent.reopen),
          ActionStatus.pending);
    });

    test('terminal statuses reject every event', () {
      for (final terminal in kTerminalStatuses) {
        for (final event in ActionEvent.values) {
          expect(nextStatus(terminal, event), isNull,
              reason: '$terminal must be terminal for $event');
        }
      }
      expect(kTerminalStatuses, {
        ActionStatus.dismissed,
        ActionStatus.completed,
        ActionStatus.expired,
      });
    });
  });

  group('Snooze wake evaluation', () {
    final now = DateTime(2026, 10, 6, 12);

    test('null snoozeUntil means wake immediately', () {
      expect(shouldWake(snoozeUntil: null, now: now), isTrue);
    });

    test('wakes only after snoozeUntil has elapsed', () {
      expect(
          shouldWake(snoozeUntil: now.add(const Duration(minutes: 1)), now: now),
          isFalse);
      expect(shouldWake(snoozeUntil: now.subtract(const Duration(seconds: 1)),
          now: now), isTrue);
      expect(shouldWake(snoozeUntil: now, now: now), isTrue);
    });
  });

  group('Badge vs visible status sets', () {
    test('badge set excludes acknowledged; visible set includes it', () {
      expect(kBadgeStatuses, {ActionStatus.pending, ActionStatus.snoozed});
      expect(kVisibleStatuses,
          {ActionStatus.pending, ActionStatus.acknowledged, ActionStatus.snoozed});
      expect(kBadgeStatuses.difference(kVisibleStatuses), isEmpty);
    });
  });

  group('TTL windows', () {
    test('urgent 24h, high 48h, normal/low 7d', () {
      expect(kTtlByPriority['urgent'], const Duration(hours: 24));
      expect(kTtlByPriority['high'], const Duration(hours: 48));
      expect(kTtlByPriority['normal'], const Duration(days: 7));
      expect(kTtlByPriority['low'], const Duration(days: 7));
    });
  });
}
