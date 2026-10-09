import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive/hive.dart';
import 'package:thaibahive_mobile/core/network/api_client.dart';
import 'package:thaibahive_mobile/features/search/data/recent_searches_service.dart';
import 'package:thaibahive_mobile/features/search/data/search_models.dart';
import 'package:thaibahive_mobile/features/search/data/search_repository.dart';
import 'package:thaibahive_mobile/features/search/presentation/search_provider.dart';

class _FakeSearchRepository extends SearchRepository {
  _FakeSearchRepository() : super(apiClient: ApiClient(baseUrl: 'http://localhost'));

  int searchCallCount = 0;
  String lastQuery = '';

  @override
  Future<GlobalSearchResponse> search(
    String query, {
    List<String>? types,
    int page = 1,
    int limit = 20,
    CancelToken? cancelToken,
  }) async {
    searchCallCount++;
    lastQuery = query;

    if (query == 'throw_error') {
      throw Exception('Network request failed');
    }

    return GlobalSearchResponse(
      query: query,
      total: 1,
      results: [
        SearchResult(
          id: 'res-1',
          entityType: 'students',
          title: 'Result for $query',
          nativeRoute: '/students/res-1',
          webRoute: '/students/res-1',
        ),
      ],
      grouped: {
        'students': [
          SearchResult(
            id: 'res-1',
            entityType: 'students',
            title: 'Result for $query',
            nativeRoute: '/students/res-1',
            webRoute: '/students/res-1',
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
  late _FakeSearchRepository fakeRepo;

  setUp(() async {
    tempDir = await Directory.systemTemp.createTemp('search_provider_test_');
    recentService = RecentSearchesService();
    await recentService.init(hiveHomePath: tempDir.path);
    fakeRepo = _FakeSearchRepository();
  });

  tearDown(() async {
    await Hive.close();
    if (await tempDir.exists()) {
      await tempDir.delete(recursive: true);
    }
  });

  test('initial state is empty', () {
    final notifier = SearchNotifier(
      repository: fakeRepo,
      recentService: recentService,
    );
    expect(notifier.state.query, isEmpty);
    expect(notifier.state.results, isEmpty);
    expect(notifier.state.isLoading, isFalse);
    expect(notifier.state.selectedIndex, equals(-1));
    notifier.dispose();
  });

  test('debounces queries by 150ms', () async {
    final notifier = SearchNotifier(
      repository: fakeRepo,
      recentService: recentService,
    );

    notifier.onQueryChanged('a');
    notifier.onQueryChanged('ab');
    notifier.onQueryChanged('abc');

    // Before 150ms, search has not executed yet
    await Future.delayed(const Duration(milliseconds: 50));
    expect(fakeRepo.searchCallCount, equals(0));

    // After 150ms, only 'abc' executes
    await Future.delayed(const Duration(milliseconds: 200));
    expect(fakeRepo.searchCallCount, equals(1));
    expect(fakeRepo.lastQuery, equals('abc'));

    expect(notifier.state.results.length, equals(1));
    expect(notifier.state.results.first.title, equals('Result for abc'));
    expect(notifier.state.selectedIndex, equals(0));
    notifier.dispose();
  });

  test('clearing query resets state', () async {
    final notifier = SearchNotifier(
      repository: fakeRepo,
      recentService: recentService,
    );

    notifier.onQueryChanged('abc');
    await Future.delayed(const Duration(milliseconds: 200));

    expect(notifier.state.results.length, equals(1));

    notifier.onQueryChanged('');
    await Future.delayed(const Duration(milliseconds: 50));

    expect(notifier.state.query, isEmpty);
    expect(notifier.state.results, isEmpty);
    expect(notifier.state.totalResults, equals(0));
    expect(notifier.state.selectedIndex, equals(-1));
    notifier.dispose();
  });

  test('navigates selected index', () async {
    final notifier = SearchNotifier(
      repository: fakeRepo,
      recentService: recentService,
    );

    notifier.onQueryChanged('abc');
    await Future.delayed(const Duration(milliseconds: 200));

    expect(notifier.state.selectedIndex, equals(0));

    notifier.selectNextResult();
    expect(notifier.state.selectedIndex, equals(0)); // only 1 result, wraps around

    notifier.selectPreviousResult();
    expect(notifier.state.selectedIndex, equals(0));
    notifier.dispose();
  });

  test('handles search failure and sets error message', () async {
    final notifier = SearchNotifier(
      repository: fakeRepo,
      recentService: recentService,
    );

    notifier.onQueryChanged('throw_error');
    await Future.delayed(const Duration(milliseconds: 200));

    expect(notifier.state.isLoading, isFalse);
    expect(notifier.state.errorMessage, isNotNull);
    notifier.dispose();
  });

  test('toggles entity filter types', () {
    final notifier = SearchNotifier(
      repository: fakeRepo,
      recentService: recentService,
    );

    notifier.toggleEntityType('students');
    expect(notifier.state.selectedTypes, equals(['students']));

    notifier.toggleEntityType('students');
    expect(notifier.state.selectedTypes, isEmpty);
    notifier.dispose();
  });
}
