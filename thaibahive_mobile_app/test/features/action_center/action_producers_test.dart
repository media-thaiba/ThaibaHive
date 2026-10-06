import 'package:flutter_test/flutter_test.dart';
import 'package:thaibahive_mobile/features/action_center/action_mapper.dart';
import 'package:thaibahive_mobile/features/action_center/action_producers.dart';
import 'package:thaibahive_mobile/features/action_center/action_state_machine.dart';
import 'package:thaibahive_mobile/features/action_center/controller.dart';

ActionItem _item({
  required String id,
  required String dedupeKey,
  ActionSource source = ActionSource.pull,
  ActionPriority priority = ActionPriority.normal,
  String route = '/tasks',
}) {
  return ActionItem(
    id: id,
    title: 'Title $id',
    description: 'Desc',
    capability: '',
    route: route,
    createdAt: DateTime(2026, 10, 6, 8),
    priority: priority,
    dedupeKey: dedupeKey,
    source: source,
  );
}

void main() {
  group('reconcilePull — replace semantics', () {
    late ActionCenterController controller;

    setUp(() {
      controller = ActionCenterController(autoHydrate: false);
    });

    tearDown(() {
      controller.dispose();
    });

    test('successful source replaces only its own pull-derived prefix', () async {
      controller.queueAction(_item(id: 't-old', dedupeKey: 'task:t-old'));
      controller.queueAction(
        _item(id: 'n1', dedupeKey: 'notification:n1', route: '/notifications'),
      );

      await reconcilePull(
        controller: controller,
        sources: {
          'task:': () async => [_item(id: 't-new', dedupeKey: 'task:t-new')],
          'notification:': () async => null, // failed → keep existing
        },
      );

      final keys = controller.items.map((i) => i.dedupeKey).toSet();
      expect(keys, {'task:t-new', 'notification:n1'});
      expect(keys.contains('task:t-old'), isFalse);
    });

    test('failed source (null) keeps its items; empty (403) clears them',
        () async {
      controller.queueAction(_item(id: 't1', dedupeKey: 'task:t1'));
      controller.queueAction(
        _item(id: 'h1', dedupeKey: 'helpdesk:h1', route: '/help-desk'),
      );

      await reconcilePull(
        controller: controller,
        sources: {
          'task:': () async => null, // network failure → keep
          'helpdesk:': () async => <ActionItem>[], // 403/empty → clear
        },
      );

      final keys = controller.items.map((i) => i.dedupeKey).toSet();
      expect(keys, {'task:t1'});
    });

    test('lateArrivals: live item merged with a stale pull item survives replace',
        () async {
      // Stale pull item still in state…
      controller.queueAction(_item(id: 'n1', dedupeKey: 'notification:n1'));
      // …an SSE item for the same key arrives during the flight (buffered).
      final liveArrival = _item(
        id: 'n1',
        dedupeKey: 'notification:n1',
        source: ActionSource.sse,
      );
      final lateArrivals = [liveArrival];

      await reconcilePull(
        controller: controller,
        sources: {
          // Server no longer lists it → replacement drops the stale pull item.
          'notification:': () async => <ActionItem>[],
        },
        lateArrivals: lateArrivals,
      );

      final survivors = controller.items
          .where((i) => i.dedupeKey == 'notification:n1')
          .toList();
      expect(survivors, hasLength(1));
      expect(survivors.single.source, ActionSource.sse);
    });

    test('throws inside a fetcher count as failure, not crash', () async {
      controller.queueAction(_item(id: 't1', dedupeKey: 'task:t1'));

      await reconcilePull(
        controller: controller,
        sources: {
          'task:': () async => throw Exception('boom'),
        },
      );

      expect(controller.items.single.dedupeKey, 'task:t1');
    });
  });

  group('producers — double enqueue & redelivery', () {
    late ActionCenterController controller;

    setUp(() {
      controller = ActionCenterController(autoHydrate: false);
    });

    tearDown(() {
      controller.dispose();
    });

    test('FCM then pull of the same notification stays a single item', () {
      final fcmItem = ActionMapper.fromFcmData(
        {'type': 'general', 'id': 'n7'},
        title: 'Update',
        body: 'body',
      )!;
      final pullItem = ActionMapper.fromNotificationJson({
        'id': 'n7',
        'type': 'general',
        'title': 'Update',
        'isRead': false,
        'createdAt': '2026-10-06T08:00:00.000Z',
      })!;

      controller.queueAction(fcmItem);
      controller.queueActions([pullItem]);

      expect(controller.items, hasLength(1));
      expect(controller.items.single.source, ActionSource.fcm);
      expect(controller.items.single.status, ActionStatus.pending);
    });

    test('reconnect redelivery of the same SSE frame is idempotent', () {
      final frame = {
        'type': 'new',
        'notification': {
          'id': 'n9',
          'type': 'task',
          'title': 'Redelivered',
          'isRead': false,
          'createdAt': '2026-10-06T08:00:00.000Z',
        },
      };

      final first = ActionMapper.fromSsePayload(frame);
      final second = ActionMapper.fromSsePayload(frame);
      controller.queueAction(first!);
      controller.queueAction(second!);

      expect(controller.items, hasLength(1));
      expect(controller.items.single.dedupeKey, 'notification:n9');
    });

    test('pull replace + live race keeps exactly one merged item', () async {
      // Live FCM item enqueued during flight (buffered by the bootstrap).
      final live = ActionMapper.fromFcmData(
        {'type': 'leave', 'id': 'n12'},
        title: 'Leave decided',
      )!;
      controller.queueAction(live);
      final lateArrivals = [
        _item(
          id: 'n12',
          dedupeKey: 'notification:n12',
          source: ActionSource.fcm,
          priority: ActionPriority.urgent,
          route: '/leaves',
        ),
      ];

      await reconcilePull(
        controller: controller,
        sources: {
          // Stale empty pull replaces, live arrival merges back.
          'notification:': () async => <ActionItem>[],
        },
        lateArrivals: lateArrivals,
      );

      final matched =
          controller.items.where((i) => i.dedupeKey == 'notification:n12');
      expect(matched, hasLength(1));
      expect(matched.single.source, ActionSource.fcm);
    });
  });
}
