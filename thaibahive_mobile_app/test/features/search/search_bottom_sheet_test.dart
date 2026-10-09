import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive/hive.dart';
import 'package:thaibahive_mobile/core/network/api_client.dart';
import 'package:thaibahive_mobile/features/search/data/recent_searches_service.dart';
import 'package:thaibahive_mobile/features/search/data/search_models.dart';
import 'package:thaibahive_mobile/features/search/data/search_repository.dart';
import 'package:thaibahive_mobile/features/search/presentation/search_bottom_sheet.dart';
import 'package:thaibahive_mobile/features/search/presentation/search_provider.dart';

class _FakeSearchRepoForWidget extends SearchRepository {
  _FakeSearchRepoForWidget() : super(apiClient: ApiClient(baseUrl: 'http://localhost'));

  @override
  Future<GlobalSearchResponse> search(
    String query, {
    List<String>? types,
    int page = 1,
    int limit = 20,
    CancelToken? cancelToken,
  }) async {
    return GlobalSearchResponse(
      query: query,
      total: 2,
      results: [
        const SearchResult(
          id: 'std-1',
          entityType: 'students',
          title: 'John Doe',
          subtitle: 'Grade 10-A',
          nativeRoute: '/students/std-1',
          webRoute: '/students/std-1',
        ),
        const SearchResult(
          id: 'req-1',
          entityType: 'purchase-requests',
          title: 'Lab Equipment',
          subtitle: 'Pending Approval',
          nativeRoute: '/purchases/req-1',
          webRoute: '/purchases/req-1',
          isWebOnly: true,
        ),
      ],
      grouped: {
        'students': [
          const SearchResult(
            id: 'std-1',
            entityType: 'students',
            title: 'John Doe',
            subtitle: 'Grade 10-A',
            nativeRoute: '/students/std-1',
            webRoute: '/students/std-1',
          ),
        ],
        'purchase-requests': [
          const SearchResult(
            id: 'req-1',
            entityType: 'purchase-requests',
            title: 'Lab Equipment',
            subtitle: 'Pending Approval',
            nativeRoute: '/purchases/req-1',
            webRoute: '/purchases/req-1',
            isWebOnly: true,
          ),
        ],
      },
    );
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late Directory tempDir;
  late RecentSearchesService recentService;
  late _FakeSearchRepoForWidget fakeRepo;

  setUp(() async {
    tempDir = await Directory.systemTemp.createTemp('search_widget_test_');
    recentService = RecentSearchesService();
    await recentService.init(hiveHomePath: tempDir.path);
    fakeRepo = _FakeSearchRepoForWidget();
  });

  tearDown(() async {
    await Hive.close();
    if (await tempDir.exists()) {
      await tempDir.delete(recursive: true);
    }
  });

  Widget createTestWidget() {
    return ProviderScope(
      overrides: [
        searchRepositoryProvider.overrideWithValue(fakeRepo),
        recentSearchesServiceProvider.overrideWithValue(recentService),
      ],
      child: const MaterialApp(
        home: Scaffold(
          body: SearchBottomSheet(),
        ),
      ),
    );
  }

  testWidgets('renders input and initial empty state', (tester) async {
    await tester.pumpWidget(createTestWidget());
    await tester.pump();

    expect(find.byType(TextField), findsOneWidget);
    expect(find.text('Search students, staff, tasks, events...'), findsOneWidget);
    expect(find.text('Global Search & Omnibox'), findsOneWidget);
  });

  testWidgets('displays search results after typing query', (tester) async {
    await tester.pumpWidget(createTestWidget());
    await tester.pump();

    await tester.enterText(find.byType(TextField), 'John');
    await tester.pump(const Duration(milliseconds: 200));
    await tester.pumpAndSettle();

    expect(find.text('John Doe'), findsOneWidget);
    expect(find.text('Lab Equipment'), findsOneWidget);
    expect(find.text('Grade 10-A'), findsOneWidget);
  });

  testWidgets('result tile meets 48dp min height requirement', (tester) async {
    await tester.pumpWidget(createTestWidget());
    await tester.pump();

    await tester.enterText(find.byType(TextField), 'John');
    await tester.pump(const Duration(milliseconds: 200));
    await tester.pumpAndSettle();

    final finder = find.byWidgetPredicate(
      (w) => w is ConstrainedBox && w.constraints.minHeight >= 48,
    );
    expect(finder, findsWidgets);
  });

  testWidgets('filter chips can be toggled', (tester) async {
    await tester.pumpWidget(createTestWidget());
    await tester.pump();

    expect(find.text('All'), findsOneWidget);
    expect(find.text('Students'), findsOneWidget);

    await tester.tap(find.text('Students'));
    await tester.pump();
  });
}
