import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:hive/hive.dart';
import 'package:thaibahive_mobile/features/action_center/action_state_machine.dart';
import 'package:thaibahive_mobile/features/action_center/controller.dart';

ActionItem makeItem({
  String id = 'a1',
  String dedupeKey = 'notification:n1',
  ActionPriority priority = ActionPriority.normal,
  ActionSource source = ActionSource.pull,
  DateTime? createdAt,
}) {
  final created = createdAt ?? DateTime.now();
  return ActionItem(
    id: id,
    title: 'Title $id',
    description: 'Desc $id',
    capability: 'tasks:read',
    route: '/tasks',
    createdAt: created,
    priority: priority,
    dedupeKey: dedupeKey,
    source: source,
  );
}

void main() {
  group('ActionCenterController (in-memory)', () {
    late ActionCenterController controller;

    setUp(() {
      controller = ActionCenterController(autoHydrate: false);
    });

    tearDown(() {
      controller.dispose();
    });

    test('enqueue starts items pending and badge-counted', () {
      controller.queueAction(makeItem());
      expect(controller.state.single.status, ActionStatus.pending);
      expect(controller.pendingCount, 1);
      expect(controller.urgentCount, 0);
      expect(controller.visibleActions.length, 1);
    });

    test('dedupe: same key merges live items, keeps max priority, keeps createdAt',
        () {
      final t0 = DateTime(2026, 10, 6, 8);
      controller.queueAction(
          makeItem(priority: ActionPriority.normal, createdAt: t0));
      controller.queueAction(
          makeItem(priority: ActionPriority.urgent, createdAt: t0));

      expect(controller.state.length, 1);
      expect(controller.state.single.priority, ActionPriority.urgent);
      expect(controller.state.single.createdAt, t0);
      expect(controller.pendingCount, 1);
    });

    test('dedupe: terminal duplicate is dropped (dismiss stays dismissed)', () {
      controller.queueAction(makeItem());
      final id = controller.state.single.id;
      controller.dismiss(id);
      expect(controller.state.single.status, ActionStatus.dismissed);

      final changed = controller.enqueue(makeItem(id: 'a2'));
      expect(changed, isFalse);
      expect(controller.state.single.status, ActionStatus.dismissed);
      expect(controller.pendingCount, 0);
      expect(controller.visibleActions, isEmpty);
    });

    test('acknowledged items are visible but excluded from badge counts', () {
      controller.queueAction(makeItem());
      controller.acknowledge(controller.state.single.id);
      expect(controller.state.single.status, ActionStatus.acknowledged);
      expect(controller.visibleActions.length, 1);
      expect(controller.pendingCount, 0);
      expect(controller.urgentCount, 0);
    });

    test('urgent count only counts urgent + badge statuses', () {
      controller.queueAction(makeItem(id: 'u1', dedupeKey: 'notification:u1',
          priority: ActionPriority.urgent));
      controller.queueAction(makeItem(id: 'n1', dedupeKey: 'notification:n2'));
      expect(controller.pendingCount, 2);
      expect(controller.urgentCount, 1);
    });

    test('illegal transition is ignored (complete on dismissed)', () {
      controller.queueAction(makeItem());
      controller.dismiss(controller.state.single.id);
      final result =
          controller.apply(controller.state.single.id, ActionEvent.complete);
      expect(result, isNull);
      expect(controller.state.single.status, ActionStatus.dismissed);
    });

    test('snooze sets snoozeUntil; reconcile wakes lazily after elapsed', () {
      controller.queueAction(makeItem());
      final id = controller.state.single.id;
      final until = DateTime.now().add(const Duration(hours: 2));
      controller.snooze(id, until: until);

      expect(controller.state.single.status, ActionStatus.snoozed);
      expect(controller.state.single.snoozeUntil, until);

      // Not yet elapsed — reconcile leaves it snoozed.
      controller.reconcile(now: until.subtract(const Duration(minutes: 1)));
      expect(controller.state.single.status, ActionStatus.snoozed);

      // Elapsed — snoozed → pending.
      controller.reconcile(now: until.add(const Duration(seconds: 1)));
      expect(controller.state.single.status, ActionStatus.pending);
      expect(controller.state.single.snoozeUntil, isNull);
      expect(controller.pendingCount, 1);
    });

    test('TTL expiry applies lazily on reconcile (pending → expired)', () {
      controller.queueAction(makeItem(priority: ActionPriority.urgent));
      final created = controller.state.single.createdAt;
      expect(controller.state.single.expiresAt,
          created.add(kTtlByPriority['urgent']!));

      controller.reconcile(
          now: created.add(kTtlByPriority['urgent']!).add(const Duration(minutes: 1)));
      expect(controller.state.single.status, ActionStatus.expired);
      expect(controller.pendingCount, 0);
      expect(controller.visibleActions, isEmpty);
    });

    test('re-enqueue does not extend TTL (createdAt stable)', () {
      final t0 = DateTime(2026, 10, 6, 8);
      controller.queueAction(makeItem(createdAt: t0));
      controller.queueAction(makeItem(createdAt: t0.add(const Duration(hours: 5))));
      expect(controller.state.single.createdAt, t0);
      expect(controller.state.single.expiresAt,
          t0.add(kTtlByPriority['normal']!));
    });

    test('clearAll dismisses every visible item and arms mark-all server ack',
        () {
      controller
        ..queueAction(makeItem(id: 'a', dedupeKey: 'notification:n1'))
        ..queueAction(makeItem(id: 'b', dedupeKey: 'task:t1'));
      controller.clearAll();

      expect(controller.state.every((i) => i.status == ActionStatus.dismissed),
          isTrue);
      expect(controller.pendingCount, 0);
      expect(controller.hasPendingMarkAll, isTrue);
      // task-derived action does not add a single-item ack
      expect(controller.pendingAcks, isEmpty);
    });

    test('dismissing a notification-derived action queues a retryable ack',
        () {
      controller.queueAction(makeItem(dedupeKey: 'notification:n9'));
      controller.dismiss(controller.state.single.id);
      expect(controller.pendingAcks, {'n9'});
    });

    test('ack retry succeeds → pending set empties; failure → retained',
        () async {
      var calls = <String>[];
      var shouldSucceed = false;
      final c = ActionCenterController(
        autoHydrate: false,
        serverAckFn: (id) async {
          calls.add(id);
          return shouldSucceed;
        },
      );
      try {
        c.queueAction(makeItem(dedupeKey: 'notification:n7'));
        c.dismiss(c.state.single.id);
        expect(c.pendingAcks, {'n7'});

        await c.retryPendingAcks();
        expect(calls, ['n7']);
        expect(c.pendingAcks, {'n7'}, reason: 'failure must be retained');

        shouldSucceed = true;
        await c.retryPendingAcks();
        expect(c.pendingAcks, isEmpty);
      } finally {
        c.dispose();
      }
    });

    test('sortedActions: urgent first, then older createdAt', () {
      final base = DateTime(2026, 10, 6, 8);
      controller
        ..queueAction(makeItem(id: 'n', dedupeKey: 'notification:n',
            createdAt: base))
        ..queueAction(makeItem(id: 'u', dedupeKey: 'notification:u',
            priority: ActionPriority.urgent,
            createdAt: base.add(const Duration(hours: 1))));
      expect(controller.sortedActions.map((i) => i.id).toList(), ['u', 'n']);
    });
  });

  group('ActionCenterController Hive persistence', () {
    late Directory tempDir;
    late ActionCenterStore store;

    setUp(() async {
      tempDir = await Directory.systemTemp.createTemp('action_center_test');
      Hive.init(tempDir.path);
      store = ActionCenterStore();
    });

    tearDown(() async {
      await Hive.close();
      if (await tempDir.exists()) {
        await tempDir.delete(recursive: true);
      }
    });

    test('round-trips items and status across controller restarts', () async {
      final c1 = ActionCenterController(store: store, autoHydrate: false);
      await c1.hydrate();
      c1.queueAction(makeItem(dedupeKey: 'notification:n1'));
      c1.acknowledge(c1.state.single.id);
      await c1.persistNow();
      c1.dispose();

      final store2 = ActionCenterStore();
      final c2 = ActionCenterController(store: store2, autoHydrate: false);
      await c2.hydrate();
      try {
        expect(c2.state.length, 1);
        expect(c2.state.single.dedupeKey, 'notification:n1');
        expect(c2.state.single.status, ActionStatus.acknowledged);
        // badge definition survives restart
        expect(c2.pendingCount, 0);
        expect(c2.visibleActions.length, 1);
      } finally {
        c2.dispose();
      }
    });

    test('pending ack bookkeeping survives restart', () async {
      final c1 = ActionCenterController(store: store, autoHydrate: false);
      await c1.hydrate();
      c1.queueAction(makeItem(dedupeKey: 'notification:n3'));
      c1.dismiss(c1.state.single.id);
      await c1.persistNow();
      c1.dispose();

      final store2 = ActionCenterStore();
      final c2 = ActionCenterController(store: store2, autoHydrate: false);
      await c2.hydrate();
      try {
        expect(c2.pendingAcks, {'n3'});
      } finally {
        c2.dispose();
      }
    });

    test('schema version mismatch discards the box (rebuild from server)',
        () async {
      final c1 = ActionCenterController(store: store, autoHydrate: false);
      await c1.hydrate();
      c1.queueAction(makeItem());
      await c1.persistNow();
      c1.dispose();

      final box = await Hive.openBox(ActionCenterStore.boxName);
      await box.put(ActionCenterStore.metaKey, {'schemaVersion': 999});

      final store2 = ActionCenterStore();
      final c2 = ActionCenterController(store: store2, autoHydrate: false);
      await c2.hydrate();
      try {
        expect(c2.state, isEmpty);
        final meta = box.get(ActionCenterStore.metaKey) as Map;
        expect(meta['schemaVersion'], ActionCenterStore.schemaVersion);
      } finally {
        c2.dispose();
      }
    });

    test('terminal items older than retention are purged on hydration',
        () async {
      final c1 = ActionCenterController(store: store, autoHydrate: false);
      await c1.hydrate();
      c1.queueAction(makeItem(dedupeKey: 'notification:old'));
      c1.dismiss(c1.state.single.id);
      await c1.persistNow();
      c1.dispose();

      // Backdate the stored entry beyond the retention window.
      final box = await Hive.openBox(ActionCenterStore.boxName);
      final raw = Map<String, dynamic>.from(
          box.get('notification:old') as Map);
      final old = DateTime.now().subtract(kTerminalRetention + const Duration(hours: 1));
      raw['createdAt'] = old.toIso8601String();
      raw['updatedAt'] = old.toIso8601String();
      await box.put('notification:old', raw);

      final store2 = ActionCenterStore();
      final c2 = ActionCenterController(store: store2, autoHydrate: false);
      await c2.hydrate();
      try {
        expect(c2.state, isEmpty);
        expect(box.containsKey('notification:old'), isFalse);
      } finally {
        c2.dispose();
      }
    });
  });

  group('ActionItem JSON', () {
    test('round-trips every field', () {
      final item = ActionItem(
        id: 'x',
        title: 'T',
        description: 'D',
        capability: 'c',
        route: '/r',
        createdAt: DateTime(2026, 10, 6, 9, 30),
        priority: ActionPriority.high,
        status: ActionStatus.snoozed,
        dedupeKey: 'notification:nx',
        source: ActionSource.sse,
        institutionId: 'inst-1',
        expiresAt: DateTime(2026, 10, 8, 9, 30),
        snoozeUntil: DateTime(2026, 10, 6, 11),
        updatedAt: DateTime(2026, 10, 6, 10),
      );

      final restored = ActionItem.fromJson(item.toJson());
      expect(restored.toJson(), item.toJson());
      expect(restored.source, ActionSource.sse);
      expect(restored.status, ActionStatus.snoozed);
      expect(restored.institutionId, 'inst-1');
      expect(restored.snoozeUntil, DateTime(2026, 10, 6, 11));
    });

    test('default dedupeKey derives from id', () {
      final item = ActionItem(
        id: 'abc',
        title: 't',
        description: 'd',
        capability: 'c',
        route: '/r',
        createdAt: DateTime(2026, 10, 6),
      );
      expect(item.dedupeKey, 'action:abc');
    });

    test('unknown status/priority in JSON falls back safely', () {
      final restored = ActionItem.fromJson({
        'id': 'z',
        'title': 'T',
        'description': 'D',
        'capability': 'c',
        'route': '/r',
        'createdAt': DateTime.now().toIso8601String(),
        'priority': 'not-a-priority',
        'status': 'not-a-status',
        'source': 'not-a-source',
      });
      expect(restored.status, ActionStatus.pending);
      expect(restored.priority, ActionPriority.normal);
      expect(restored.source, ActionSource.local);
    });
  });
}
