import 'package:dio/dio.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import 'search_models.dart';

class SearchRepository {
  final ApiClient _apiClient;

  SearchRepository({required ApiClient apiClient}) : _apiClient = apiClient;

  Future<GlobalSearchResponse> search(
    String query, {
    List<String>? types,
    int page = 1,
    int limit = 20,
    CancelToken? cancelToken,
  }) async {
    final cleanQuery = query.trim();
    if (cleanQuery.isEmpty) {
      return const GlobalSearchResponse(
        query: '',
        total: 0,
        results: [],
        grouped: {},
      );
    }

    try {
      final queryParams = <String, dynamic>{
        'q': cleanQuery,
        'page': page,
        'limit': limit,
      };
      if (types != null && types.isNotEmpty) {
        queryParams['entityTypes'] = types.join(',');
      }

      final response = await _apiClient.dio.get(
        '/search',
        queryParameters: queryParams,
        cancelToken: cancelToken,
        options: Options(
          sendTimeout: const Duration(seconds: 5),
          receiveTimeout: const Duration(seconds: 5),
        ),
      );

      if (response.data is Map<String, dynamic>) {
        return GlobalSearchResponse.fromJson(response.data as Map<String, dynamic>, query: cleanQuery);
      }
      return GlobalSearchResponse(
        query: cleanQuery,
        total: 0,
        results: const [],
        grouped: const {},
      );
    } on DioException catch (e) {
      if (e.type == DioExceptionType.cancel) {
        rethrow;
      }
      throw AppException.fromDioException(e);
    }
  }

  Future<List<String>> suggestions(
    String query, {
    CancelToken? cancelToken,
  }) async {
    final cleanQuery = query.trim();
    if (cleanQuery.isEmpty) return const [];

    try {
      final response = await _apiClient.dio.get(
        '/search/suggestions',
        queryParameters: {'q': cleanQuery},
        cancelToken: cancelToken,
        options: Options(
          sendTimeout: const Duration(seconds: 5),
          receiveTimeout: const Duration(seconds: 5),
        ),
      );

      if (response.data is Map<String, dynamic> && response.data['data'] is List) {
        return (response.data['data'] as List).map((e) => e.toString()).toList();
      }
      if (response.data is List) {
        return (response.data as List).map((e) => e.toString()).toList();
      }
      return const [];
    } catch (_) {
      return const [];
    }
  }
}
