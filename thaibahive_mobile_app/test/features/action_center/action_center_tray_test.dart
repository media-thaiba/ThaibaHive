import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:thaibahive_mobile/features/action_center/controller.dart';
import 'package:thaibahive_mobile/features/action_center/tray.dart';

ActionItem _item(String id, String title) => ActionItem(
      id: id,
      title: title,
      description: 'description for $title',
      capability: 'task.item.view',
      route: '/tasks',
      createdAt: DateTime(2026, 10, 6, 9),
    );

void main() {
  testWidgets(
      'tray keeps acknowledged items visible with a status chip while the '
      'badge count excludes them',
      (tester) async {
    final controller = ActionCenterController(autoHydrate: false);
    controller.queueAction(_item('1', 'Pending task'));
    controller.queueAction(_item('2', 'Read notice'));
    controller.acknowledge('2');

    expect(controller.pendingCount, 1, reason: 'acknowledged is not a badge');
    expect(controller.visibleActions.length, 2,
        reason: 'acknowledged stays visible in the tray');

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          actionCenterProvider.overrideWith((ref) => controller),
        ],
        child: const MaterialApp(
          home: Scaffold(
            body: ActionCenterTray(initiallyExpanded: true),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Pending task'), findsOneWidget);
    expect(find.text('Read notice'), findsOneWidget);
    expect(find.text('Acknowledged'), findsOneWidget);
    expect(find.text('1 pending'), findsOneWidget);

    // Dismiss removes only the pending tile.
    await tester.tap(
      find.descendant(
        of: find.widgetWithText(ListTile, 'Pending task'),
        matching: find.byTooltip('Dismiss'),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Pending task'), findsNothing);
    expect(find.text('Read notice'), findsOneWidget);
    expect(find.text('0 pending'), findsOneWidget);
  });

  testWidgets('snooze affordance appears only for pending items',
      (tester) async {
    final controller = ActionCenterController(autoHydrate: false);
    controller.queueAction(_item('1', 'Pending task'));
    controller.acknowledge('1');

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          actionCenterProvider.overrideWith((ref) => controller),
        ],
        child: const MaterialApp(
          home: Scaffold(
            body: ActionCenterTray(initiallyExpanded: true),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byTooltip('Snooze 2h'), findsNothing);
    expect(find.text('Acknowledged'), findsOneWidget);
  });
}
