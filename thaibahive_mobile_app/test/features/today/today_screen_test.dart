import 'dart:async';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive/hive.dart';
import 'package:thaibahive_mobile/core/network/api_client.dart';
import 'package:thaibahive_mobile/features/attendance/data/attendance_provider.dart';
import 'package:thaibahive_mobile/features/attendance/data/attendance_repository.dart';
import 'package:thaibahive_mobile/features/attendance/presentation/attendance_punch_card.dart';
import 'package:thaibahive_mobile/features/circulars/data/circulars_provider.dart';
import 'package:thaibahive_mobile/features/circulars/data/circulars_repository.dart';
import 'package:thaibahive_mobile/features/notifications/data/notifications_provider.dart';
import 'package:thaibahive_mobile/features/timeline/data/timeline_provider.dart';
import 'package:thaibahive_mobile/features/timeline/data/timeline_repository.dart';
import 'package:thaibahive_mobile/features/today/data/today_hub_provider.dart';
import 'package:thaibahive_mobile/features/today/presentation/today_screen.dart';
import 'package:thaibahive_mobile/models/circular_model.dart';
import 'package:thaibahive_mobile/shared/widgets/error_widget.dart';
import 'package:thaibahive_mobile/shared/widgets/loading_widget.dart';

class _SeededTimelineNotifier extends TimelineNotifier {
  _SeededTimelineNotifier(List<TimelineItem> items)
      : super(TimelineRepository(ApiClient())) {
    state = TimelineState(items: items);
  }

  @override
  Future<void> loadTimeline() async {}
}

class _SeededCircularsNotifier extends CircularsNotifier {
  _SeededCircularsNotifier(List<CircularModel> circulars)
      : super(CircularsRepository(ApiClient())) {
    state = CircularsState(circulars: circulars);
  }

  @override
  Future<void> loadCirculars() async {}
}

class _SeededAttendanceNotifier extends AttendanceNotifier {
  _SeededAttendanceNotifier() : super(AttendanceRepository(Dio()));

  // Constructor calls refresh() — virtual dispatch lands here, no HTTP.
  @override
  Future<void> refresh() async {}
}

CircularModel _circular(String id, String title) => CircularModel(
      id: id,
      title: title,
      description: 'Description for $title',
      fileUrl: 'https://files/$id.pdf',
      uploadedById: 's1',
      createdAt: DateTime(2026, 10, 6, 9),
    );

TimelineItem _timelineItem(String id, String title) => TimelineItem(
      id: id,
      type: 'leave.approve',
      title: title,
      timestamp: DateTime(2026, 10, 6, 9),
    );

TodayHubManifest _customManifest() => const TodayHubManifest(
      version: 1,
      generatedAt: '2026-10-06T08:00:00.000Z',
      quickActions: [
        TodayHubQuickAction(
          id: 'canteen.order.create',
          label: 'Lunch Counter',
          icon: 'restaurant',
          route: '/canteen',
          capability: 'canteen.order.create',
        ),
        TodayHubQuickAction(
          id: 'helpdesk.ticket.create',
          label: 'Support',
          icon: 'medical_services',
          route: '/help-desk',
          capability: 'helpdesk.ticket.create',
        ),
      ],
      sections: [
        TodayHubSection(id: 'urgent_actions', priority: 1, enabled: false),
        TodayHubSection(id: 'attendance', priority: 2, enabled: false),
        TodayHubSection(id: 'quick_actions', priority: 3, maxItems: 4),
        TodayHubSection(id: 'circular', priority: 4, maxItems: 1),
        TodayHubSection(id: 'timeline', priority: 5, maxItems: 5),
      ],
    );

List<Override> _overrides({
  Object? manifestError,
  TodayHubManifest? manifest,
}) {
  return [
    todayHubProvider.overrideWith(
      manifestError != null
          ? (ref) => Future<TodayHubManifest>.error(
                manifestError,
                StackTrace.current,
              )
          : (ref) => Future.value(manifest ?? _customManifest()),
    ),
    timelineProvider
        .overrideWith((ref) => _SeededTimelineNotifier([
              _timelineItem('1', 'Leave approved for Ravi'),
            ])),
    circularsProvider.overrideWith((ref) => _SeededCircularsNotifier([
          _circular('c1', 'Mid-term schedule'),
        ])),
    unreadCountProvider.overrideWith((ref) => Future.value(3)),
    attendanceProvider.overrideWith((ref) => _SeededAttendanceNotifier()),
  ];
}

Future<void> _pumpContent(WidgetTester tester, List<Override> overrides) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: overrides,
      child: const MaterialApp(
        home: Scaffold(
          body: SingleChildScrollView(child: TodayHubContent()),
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  // The fallback manifest enables the urgent_actions section, which watches the
  // REAL actionCenterProvider → hydrate() opens Hive. Hive's _openBox completes
  // an internal completer with the error when un-initialized (unhandled even if
  // awaited), so init a temp-dir box like other Hive-backed tests.
  late Directory tempDir;

  setUpAll(() async {
    tempDir = await Directory.systemTemp.createTemp('today_hub_screen_test');
    Hive.init(tempDir.path);
  });

  tearDownAll(() async {
    await Hive.close();
    if (await tempDir.exists()) {
      await tempDir.delete(recursive: true);
    }
  });

  testWidgets('renders sections in manifest priority order', (tester) async {
    await _pumpContent(tester, _overrides());

    // Sanity: custom quick-action labels came from the manifest, not fallback.
    expect(find.text('Lunch Counter'), findsOneWidget);
    expect(find.text('Support'), findsOneWidget);
    expect(find.text('Canteen'), findsNothing);

    expect(find.byKey(const ValueKey('quick-action-canteen.order.create')),
        findsOneWidget);
    expect(find.byKey(const ValueKey('today-section-circular')), findsOneWidget);
    expect(find.byKey(const ValueKey('today-section-timeline')), findsOneWidget);

    final quickY = tester
        .getTopLeft(
            find.byKey(const ValueKey('quick-action-canteen.order.create')))
        .dy;
    final circularY = tester
        .getTopLeft(find.byKey(const ValueKey('today-section-circular')))
        .dy;
    final timelineY = tester
        .getTopLeft(find.byKey(const ValueKey('today-section-timeline')))
        .dy;

    expect(quickY < circularY, isTrue,
        reason: 'quick_actions (p3) must precede circular (p4)');
    expect(circularY < timelineY, isTrue,
        reason: 'circular (p4) must precede timeline (p5)');

    // Disabled attendance section must not render.
    expect(find.byType(AttendancePunchCard), findsNothing);
  });

  testWidgets('timeline and circular sections show seeded data', (tester) async {
    await _pumpContent(tester, _overrides());

    expect(find.text('Today\'s Timeline'), findsOneWidget);
    expect(find.text('Leave approved for Ravi'), findsOneWidget);
    expect(find.text('Latest Circular'), findsOneWidget);
    expect(find.text('Mid-term schedule'), findsOneWidget);
    // Unread badge from unreadCountProvider (D12) — value 3.
    expect(find.text('3'), findsOneWidget);
  });

  testWidgets('manifest fetch failure falls back with inline retry',
      (tester) async {
    await _pumpContent(
      tester,
      _overrides(manifestError: const FormatException('boom')),
    );

    expect(find.byType(AppErrorWidget), findsOneWidget);
    expect(find.text("Couldn't load Today hub"), findsOneWidget);

    // Fallback manifest: attendance + fallback quick actions + all sections.
    expect(find.byType(AttendancePunchCard), findsOneWidget);
    expect(find.text('Canteen'), findsOneWidget);
    expect(find.text('Helpdesk'), findsOneWidget);
    expect(find.byKey(const ValueKey('today-section-timeline')), findsOneWidget);
    expect(find.byKey(const ValueKey('today-section-circular')), findsOneWidget);
  });

  testWidgets('manifest loading shows shimmer, not an error', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          // Never completes → provider stays in AsyncLoading (no pending timers).
          todayHubProvider.overrideWith(
              (ref) => Completer<TodayHubManifest>().future),
          timelineProvider
              .overrideWith((ref) => _SeededTimelineNotifier(const [])),
          circularsProvider
              .overrideWith((ref) => _SeededCircularsNotifier(const [])),
        ],
        child: const MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(child: TodayHubContent()),
          ),
        ),
      ),
    );
    await tester.pump();

    expect(find.byType(ListShimmer), findsOneWidget);
    expect(find.byType(AppErrorWidget), findsNothing);
  });
}
