import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:thaibahive_mobile/core/network/api_client.dart';
import 'package:thaibahive_mobile/core/services/sse_service.dart';
import 'package:thaibahive_mobile/features/announcements/data/announcements_cache_provider.dart';
import 'package:thaibahive_mobile/features/circulars/data/circulars_provider.dart';
import 'package:thaibahive_mobile/features/circulars/data/circulars_repository.dart';
import 'package:thaibahive_mobile/features/notifications/data/notifications_provider.dart';
import 'package:thaibahive_mobile/features/notices/presentation/notices_screen.dart';
import 'package:thaibahive_mobile/features/polls/data/polls_provider.dart';
import 'package:thaibahive_mobile/features/polls/data/polls_repository.dart';
import 'package:thaibahive_mobile/models/circular_model.dart';
import 'package:thaibahive_mobile/models/poll_model.dart';

class _SeededSSE extends SSEServiceNotifier {
  _SeededSSE() : super();
}

class _SeededCirculars extends CircularsNotifier {
  _SeededCirculars(List<CircularModel> items)
      : super(CircularsRepository(ApiClient())) {
    state = CircularsState(circulars: items);
  }

  @override
  Future<void> loadCirculars() async {}
}

class _SeededPolls extends PollsNotifier {
  _SeededPolls(List<PollModel> items) : super(PollsRepository(ApiClient())) {
    state = PollsState(polls: items);
  }

  @override
  Future<void> loadPolls() async {}
}

class _SeededAnnouncements extends AnnouncementsCacheNotifier {
  _SeededAnnouncements() : super() {
    state = AsyncValue.data(const CachedAnnouncementsState());
  }

  @override
  Future<void> fetchAnnouncements({String priority = 'all'}) async {}
}

CircularModel _circular(String id, String title) => CircularModel(
      id: id,
      title: title,
      description: 'description',
      fileUrl: 'https://files/$id.pdf',
      uploadedById: 's1',
      createdAt: DateTime(2026, 10, 6, 9),
    );

PollModel _poll(String id, String title) => PollModel(
      id: id,
      title: title,
      options: const [],
      expiresAt: DateTime(2026, 12, 1),
      isActive: true,
      createdById: 's1',
      createdAt: DateTime(2026, 10, 5),
    );

List<Override> _overrides() => [
      sseServiceProvider.overrideWith((ref) => _SeededSSE()),
      circularsProvider
          .overrideWith((ref) => _SeededCirculars([_circular('c1', 'Budget circular')])),
      pollsProvider.overrideWith(
          (ref) => _SeededPolls([_poll('p1', 'Citywide satisfaction poll')])),
      cachedAnnouncementsProvider.overrideWith((ref) => _SeededAnnouncements()),
      unreadCountProvider.overrideWith((ref) => Future.value(0)),
    ];

void main() {
  testWidgets(
      'segmented control switches Circulars / Announcements / Polls without nested toolbars',
      (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: _overrides(),
        child: const MaterialApp(home: NoticesScreen()),
      ),
    );
    await tester.pumpAndSettle();

    // Default segment: Circulars content.
    expect(find.text('Budget circular'), findsOneWidget);
    expect(find.text('Citywide satisfaction poll'), findsNothing);
    // Single AppBar (the wrapper's) — no nested "Circulars" toolbar.
    expect(find.text('Notices'), findsOneWidget);

    // Switch to Polls.
    await tester.tap(find.text('Polls'));
    await tester.pumpAndSettle();
    expect(find.text('Citywide satisfaction poll'), findsOneWidget);
    expect(find.text('Budget circular'), findsNothing);
    expect(find.text('Expired'), findsOneWidget); // filter chip

    // Switch to Announcements (seeded empty).
    await tester.tap(find.text('Announcements'));
    await tester.pumpAndSettle();
    expect(find.text('No Announcements'), findsOneWidget);
    expect(find.text('Citywide satisfaction poll'), findsNothing);
    expect(find.text('Budget circular'), findsNothing);
  });
}
