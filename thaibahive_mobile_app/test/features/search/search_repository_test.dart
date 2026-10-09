import 'dart:convert';
import 'dart:typed_data';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:thaibahive_mobile/core/network/api_client.dart';
import 'package:thaibahive_mobile/features/search/data/search_models.dart';
import 'package:thaibahive_mobile/features/search/data/search_repository.dart';

class _MockSearchAdapter implements HttpClientAdapter {
  Map<String, dynamic>? searchResponseData;
  List<dynamic>? suggestionsResponseData;
  Duration delay = Duration.zero;
  int? statusCode = 200;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    if (delay > Duration.zero) {
      await Future.delayed(delay);
    }

    if (options.path.contains('/search/suggestions')) {
      final payload = jsonEncode({'success': true, 'data': suggestionsResponseData ?? ['John Doe', 'Jane Doe']});
      return ResponseBody.fromString(
        payload,
        statusCode ?? 200,
        headers: {Headers.contentTypeHeader: [Headers.jsonContentType]},
      );
    }

    if (options.path.contains('/search')) {
      final payload = jsonEncode({
        'success': true,
        'data': searchResponseData ?? {
          'students': [
            {
              'id': 'std-1',
              'entityType': 'students',
              'title': 'Ahmad Student',
              'subtitle': 'Class 10-A',
              'nativeRoute': '/students/std-1',
              'webRoute': '/students/std-1',
              'isWebOnly': false,
            }
          ],
          'purchase-requests': [
            {
              'id': 'pur-1',
              'entityType': 'purchase-requests',
              'title': 'Chemistry Lab Reagents',
              'subtitle': '₹15,000',
              'nativeRoute': '/purchases/pur-1',
              'webRoute': '/purchases/pur-1',
              'isWebOnly': true,
            }
          ],
          'totalResults': 2,
        }
      });
      return ResponseBody.fromString(
        payload,
        statusCode ?? 200,
        headers: {Headers.contentTypeHeader: [Headers.jsonContentType]},
      );
    }

    return ResponseBody.fromString(
      '{}',
      404,
      headers: {Headers.contentTypeHeader: [Headers.jsonContentType]},
    );
  }

  @override
  void close({bool force = false}) {}
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  FlutterSecureStorage.setMockInitialValues({});

  late ApiClient apiClient;
  late _MockSearchAdapter mockAdapter;
  late SearchRepository repository;

  setUp(() {
    apiClient = ApiClient(baseUrl: 'https://api.example.com');
    mockAdapter = _MockSearchAdapter();
    apiClient.dio.httpClientAdapter = mockAdapter;
    repository = SearchRepository(apiClient: apiClient);
  });

  group('SearchRepository', () {
    test('returns empty results when query is empty', () async {
      final response = await repository.search('   ');
      expect(response.total, equals(0));
      expect(response.results, isEmpty);
    });

    test('fetches and parses search results successfully', () async {
      final response = await repository.search('Chemistry');

      expect(response.total, equals(2));
      expect(response.results.length, equals(2));

      final student = response.results.firstWhere((r) => r.id == 'std-1');
      expect(student.title, equals('Ahmad Student'));
      expect(student.routeStrategy, equals(EntityRouteStrategy.native));
      expect(student.isWebOnly, isFalse);

      final purchase = response.results.firstWhere((r) => r.id == 'pur-1');
      expect(purchase.title, equals('Chemistry Lab Reagents'));
      expect(purchase.routeStrategy, equals(EntityRouteStrategy.handoff));
      expect(purchase.isWebOnly, isTrue);
    });

    test('fetches suggestions', () async {
      final list = await repository.suggestions('Ah');
      expect(list, equals(['John Doe', 'Jane Doe']));
    });

    test('respects CancelToken', () async {
      mockAdapter.delay = const Duration(milliseconds: 300);
      final cancelToken = CancelToken();

      final searchFuture = repository.search('John', cancelToken: cancelToken);
      cancelToken.cancel('Cancelled by user');

      expect(
        () async => await searchFuture,
        throwsA(anything),
      );
    });
  });
}
